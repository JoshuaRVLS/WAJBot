import { Command } from '../types/command.js';
import { commandMap } from './index.js';

export const help: Command = {
    name: 'help',
    description: 'Show available commands',
    usage: '!help',
    aliases: ['menu', 'list'],
    execute: async (sock, msg, args) => {
        let text = '*🤖 WAJBot Commands*\n\n';

        // Get unique commands (filter out aliases which point to same object)
        const seen = new Set<Command>();

        commandMap.forEach((cmd) => {
            if (seen.has(cmd)) return;
            seen.add(cmd);

            text += `*!${cmd.name}*\n`;
            if (cmd.description) text += `📝 _${cmd.description}_\n`;
            if (cmd.usage) text += `💡 Usage: ${cmd.usage}\n`;
            text += '\n';
        });

        await sock.sendMessage(msg.key.remoteJid!, { text }, { quoted: msg });
    }
};
