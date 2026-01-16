import { Command } from '../types/command.js';
import { ping } from './ping.js';
import { sticker } from './sticker.js';
import { toimg } from './toimg.js';
import { everyone } from './everyone.js';
import { meme } from './meme.js';
import { help } from './help.js';

export const commands: Command[] = [
    ping,
    sticker,
    toimg,
    everyone,
    meme,
    help,
];

export const commandMap = new Map<string, Command>();

commands.forEach(cmd => {
    commandMap.set(cmd.name, cmd);
    cmd.aliases?.forEach(alias => commandMap.set(alias, cmd));
});
