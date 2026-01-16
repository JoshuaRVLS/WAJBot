import { WASocket, WAMessage } from '@whiskeysockets/baileys';
import { commandMap } from '../commands/index.js';

export async function handleMessage(sock: WASocket, messages: WAMessage[]) {
    for (const msg of messages) {
        if (!msg.message) continue;

        // Handle text messages (conversation, extended text, and media captions)
        const text = msg.message.conversation ||
            msg.message.extendedTextMessage?.text ||
            msg.message.imageMessage?.caption ||
            msg.message.videoMessage?.caption;

        if (!text || !text.startsWith('!')) continue;

        const [commandName, ...args] = text.slice(1).trim().split(/\s+/);
        const command = commandMap.get(commandName.toLowerCase());

        if (command) {
            await command.execute(sock, msg, args);
        }
    }
}
