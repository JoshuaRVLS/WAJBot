import { WASocket, WAMessage } from '@whiskeysockets/baileys';
import { commandMap } from '../commands/index.js';
import { isIgnoredMessageId } from '../utils/ignore.js';
import { getIO } from '../utils/socket.js';

export async function handleMessage(sock: WASocket, messages: WAMessage[]) {
    for (const msg of messages) {
        if (!msg.message) continue;
        if (msg.key.id && isIgnoredMessageId(msg.key.id)) continue;

        // Handle text messages
        const text = msg.message.conversation ||
            msg.message.extendedTextMessage?.text ||
            msg.message.imageMessage?.caption ||
            msg.message.videoMessage?.caption;

        // Emit to dashboard
        try {
            const io = getIO();
            const sender = msg.key.remoteJid;
            io.emit('msg_received', {
                sender,
                text: text || '[Media/Other]',
                timestamp: new Date().toLocaleTimeString()
            });
        } catch (e) {
            // Socket might not be ready, ignore
        }

        if (!text || !text.startsWith('!')) continue;

        const [commandName, ...args] = text.slice(1).trim().split(/\s+/);
        const command = commandMap.get(commandName.toLowerCase());

        if (command) {
            await command.execute(sock, msg, args);
        }
    }
}
