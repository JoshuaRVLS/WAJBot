import { WASocket, WAMessage } from '@whiskeysockets/baileys';

export async function handleMessage(sock: WASocket, messages: WAMessage[]) {
    for (const msg of messages) {
        if (!msg.message) continue;

        // Handle text messages (simple and extended)
        const text = msg.message.conversation || msg.message.extendedTextMessage?.text;

        if (text === '!ping') {
            await sock.sendMessage(msg.key.remoteJid!, { text: 'pong' });
        }
    }
}
