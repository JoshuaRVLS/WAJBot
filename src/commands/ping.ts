import { Command } from '../types/command.js';

export const ping: Command = {
    name: 'ping',
    description: 'Check bot latency',
    execute: async (sock, msg, _args) => {
        const timestamp = typeof msg.messageTimestamp === 'number'
            ? msg.messageTimestamp
            : msg.messageTimestamp?.toNumber() || 0;

        const latency = Date.now() - (timestamp * 1000);
        await sock.sendMessage(msg.key.remoteJid!, { text: `Pong! 🏓\nLatency: ${latency}ms` });
    }
};
