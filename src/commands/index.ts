import { Command } from '../types/command.js';
import { ping } from './ping.js';

export const commands: Command[] = [
    ping,
];

export const commandMap = new Map<string, Command>();

commands.forEach(cmd => {
    commandMap.set(cmd.name, cmd);
    cmd.aliases?.forEach(alias => commandMap.set(alias, cmd));
});
