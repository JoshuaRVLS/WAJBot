import { WAMessage, WASocket } from '@whiskeysockets/baileys'; // Import types
import { commandMap } from '../commands/index.js';
import { logger } from '../utils/logger.js';
import { isIgnoredMessageId } from '../utils/ignore.js';
import { getIO } from '../utils/socket.js';
import { prisma } from '../utils/db.js';

import { getGroupName } from '../utils/cache.js';

export const handleMessage = async (sock: WASocket, messages: WAMessage[]) => {
    for (const msg of messages) {
        if (!msg.message) continue;
        if (msg.key.id && isIgnoredMessageId(msg.key.id)) continue;

        // Extract Info
        const remoteJid = msg.key.remoteJid || 'Unknown';
        const isGroup = remoteJid.endsWith('@g.us');
        const pushName = msg.pushName || undefined;
        let chatName = undefined;

        if (isGroup) {
            chatName = await getGroupName(sock, remoteJid) || 'Unknown Group';
        }

        const text = msg.message?.conversation ||
            msg.message?.extendedTextMessage?.text ||
            msg.message?.imageMessage?.caption ||
            '[Media/Other]';

        try {
            getIO().emit('msg_received', {
                sender: remoteJid,
                pushName,
                chatName,
                text,
                timestamp: new Date().toLocaleTimeString()
            });

            // Save to Database
            await prisma.messageLog.create({
                data: {
                    sender: remoteJid,
                    pushName,
                    chatName,
                    content: text,
                    timestamp: new Date()
                }
            });
        } catch (e) {
            logger.error(e, 'Failed to log message');
        }

        if (!text || !text.startsWith('!')) continue;

        const [commandName, ...args] = text.slice(1).trim().split(/\s+/);
        const command = commandMap.get(commandName.toLowerCase());

        if (command) {
            await command.execute(sock, msg, args);
        }
    }
}
