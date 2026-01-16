import { WASocket, WAMessage } from '@whiskeysockets/baileys';
import { commandMap } from '../commands/index.js';

export async function handleMessage(sock: WASocket, messages: WAMessage[]) {
    for (const msg of messages) {
        if (!msg.message) continue;

        // Handle text messages (simple and extended)
        const text = msg.message.conversation || msg.message.extendedTextMessage?.text;

        if (!text || !text.startsWith('!')) continue;

        const [commandName, ...args] = text.slice(1).trim().split(/\s+/);
        const command = commandMap.get(commandName.toLowerCase());

        if (command) {
            await command.execute(sock, msg, args);
        }
    }
}
