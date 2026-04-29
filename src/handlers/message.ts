import { WAMessage, WASocket } from '@whiskeysockets/baileys'; // Import types
import { commandMap } from '../commands/index';
import { logger } from '../utils/logger';
import { isIgnoredMessageId } from '../utils/ignore';
import { getIO } from '../utils/socket';
import { prisma } from '../utils/db';

import { getGroupName } from '../utils/cache';

const COMMAND_PREFIX = '.';
const ALLOWED_COMMAND_CHATS = new Set(
    (process.env.WA_ALLOWED_CHATS || '')
        .split(',')
        .map((jid) => jid.trim())
        .filter(Boolean)
);

const canRunCommandsInChat = (remoteJid: string) => {
    if (ALLOWED_COMMAND_CHATS.size === 0) return true;
    return ALLOWED_COMMAND_CHATS.has(remoteJid);
};

export const handleMessage = async (sock: WASocket, messages: WAMessage[], _sessionId?: string) => {
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

        if (!text || !text.startsWith(COMMAND_PREFIX)) continue;
        if (!canRunCommandsInChat(remoteJid)) {
            logger.info({ remoteJid }, 'Blocked command from non-allowed chat');
            continue;
        }

        const [commandName, ...args] = text.slice(COMMAND_PREFIX.length).trim().split(/\s+/);
        const command = commandMap.get(commandName.toLowerCase());

        if (command) {
            await command.execute(sock, msg, args);
        }
    }
}
