import { Command } from '../types/command.js';
import { downloadMedia } from '../utils/media.js';
import { addExif } from '../utils/exif.js';
import sharp from 'sharp';

function escapeXml(unsafe: string): string {
    return unsafe.replace(/[<>&'"]/g, (c) => {
        switch (c) {
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '&': return '&amp;';
            case '\'': return '&apos;';
            case '"': return '&quot;';
            default: return c;
        }
    });
}

export const meme: Command = {
    name: 'meme',
    description: 'Create a meme with text overlay',
    usage: '!meme Top Text | Bottom Text',
    aliases: ['smeme', 'stickerwithtext'],
    execute: async (sock, msg, args) => {
        const quotedMsg = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        const targetMsg = quotedMsg ? { message: quotedMsg } : msg;

        if (targetMsg.message?.viewOnceMessageV2) {
            targetMsg.message = targetMsg.message.viewOnceMessageV2.message;
        }

        const buffer = await downloadMedia(targetMsg);

        if (!buffer) {
            await sock.sendMessage(msg.key.remoteJid!, { text: 'Please reply to an image or send an image with caption !meme text' });
            return;
        }

        const text = args.join(' ');
        const [topText, bottomText] = text.includes('|')
            ? text.split('|').map(t => t.trim())
            : ['', text.trim()];

        // SVG for text overlay
        // Using explicit pixel values for font size and stroke to ensure visibility on 512x512
        const svg = `
        <svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
            <style>
                .text { 
                    fill: white; 
                    stroke: black; 
                    stroke-width: 8px; 
                    paint-order: stroke fill;
                    font-size: 64px; 
                    font-family: Impact, Arial, sans-serif; 
                    font-weight: bold; 
                    text-anchor: middle; 
                    text-transform: uppercase;
                }
            </style>
            ${topText ? `<text x="50%" y="80" class="text">${escapeXml(topText)}</text>` : ''}
            ${bottomText ? `<text x="50%" y="480" class="text">${escapeXml(bottomText)}</text>` : ''}
        </svg>
        `;

        try {
            const stickerBuffer = await sharp(buffer)
                .resize(512, 512, {
                    fit: 'cover', // Full/Zoomed by default
                    background: { r: 0, g: 0, b: 0, alpha: 0 }
                })
                .composite([{
                    input: Buffer.from(svg),
                    gravity: 'center'
                }])
                .webp()
                .toBuffer();

            const stickerWithMeta = await addExif(stickerBuffer, 'JBot Meme', 'JBot');

            await sock.sendMessage(msg.key.remoteJid!, {
                sticker: stickerWithMeta,
                mimetype: 'image/webp'
            }, { quoted: msg });

        } catch (error) {
            console.error('Meme creation failed:', error);
            await sock.sendMessage(msg.key.remoteJid!, { text: 'Failed to create meme sticker.' });
        }
    }
};
