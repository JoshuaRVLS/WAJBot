import { Command } from '../types/command.js';
import { downloadMedia } from '../utils/media.js';
import sharp from 'sharp';

export const toimg: Command = {
    name: 'toimg',
    description: 'Convert sticker to image',
    execute: async (sock, msg, _args) => {
        const quotedMsg = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;

        if (!quotedMsg?.stickerMessage) {
            await sock.sendMessage(msg.key.remoteJid!, { text: 'Please reply to a sticker.' });
            return;
        }

        const targetMsg = { message: quotedMsg };
        const buffer = await downloadMedia(targetMsg);

        if (!buffer) {
            await sock.sendMessage(msg.key.remoteJid!, { text: 'Failed to download sticker.' });
            return;
        }

        try {
            const image = await sharp(buffer)
                .png()
                .toBuffer();

            await sock.sendMessage(msg.key.remoteJid!, {
                image: image,
                caption: 'Here is your image'
            }, { quoted: msg });

        } catch (error) {
            console.error('Image conversion failed:', error);
            await sock.sendMessage(msg.key.remoteJid!, { text: 'Failed to convert sticker to image.' });
        }
    }
};
