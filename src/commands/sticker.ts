import { Command } from '../types/command.js';
import { downloadMedia } from '../utils/media.js';
import { addExif } from '../utils/exif.js';
import sharp from 'sharp';

export const sticker: Command = {
    name: 'sticker',
    aliases: ['s'],
    description: 'Convert image to sticker',
    execute: async (sock, msg, args) => {
        const quotedMsg = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        const targetMsg = quotedMsg ? { message: quotedMsg } : msg;

        // Handle viewOnce messages by "unwrapping" them
        if (targetMsg.message?.viewOnceMessageV2) {
            targetMsg.message = targetMsg.message.viewOnceMessageV2.message;
        }

        const buffer = await downloadMedia(targetMsg);

        if (!buffer) {
            await sock.sendMessage(msg.key.remoteJid!, { text: 'Please reply to an image or send an image with caption !sticker' });
            return;
        }

        // Check for "full" or "crop" in arguments to fill the sticker
        const useCover = args.some(arg => ['full', 'crop'].includes(arg.toLowerCase()));
        console.log(`[Sticker Cmd] Args: ${JSON.stringify(args)}, Mode: ${useCover ? 'COVER' : 'CONTAIN'}`);

        try {
            const stickerBuffer = await sharp(buffer)
                .resize(512, 512, {
                    fit: useCover ? 'cover' : 'contain',
                    background: { r: 0, g: 0, b: 0, alpha: 0 }
                })
                .webp()
                .toBuffer();

            const stickerWithMeta = await addExif(stickerBuffer, 'JBot Pack', 'JBot');

            // Send as sticker
            await sock.sendMessage(msg.key.remoteJid!, {
                sticker: stickerWithMeta,
                mimetype: 'image/webp'
            }, { quoted: msg });

        } catch (error) {
            console.error('Sticker creation failed:', error);
            await sock.sendMessage(msg.key.remoteJid!, { text: 'Failed to create sticker.' });
        }
    }
};
