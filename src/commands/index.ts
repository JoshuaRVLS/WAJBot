import { Command } from '../types/command';
import { ping } from './ping';
import { sticker } from './sticker';
import { toimg } from './toimg';
import { everyone } from './everyone';
import { meme } from './meme';
import { help } from './help';
import { tv } from './tv';
import { tvanal } from './tvanal';
import { saham } from './saham';

export const commands: Command[] = [
    ping,
    sticker,
    toimg,
    everyone,
    meme,
    tv,
    tvanal,
    saham,
    help,
];

export const commandMap = new Map<string, Command>();

commands.forEach(cmd => {
    commandMap.set(cmd.name, cmd);
    cmd.aliases?.forEach(alias => commandMap.set(alias, cmd));
});
