import { WAMessage, downloadContentFromMessage, MediaType } from '@whiskeysockets/baileys';
import { Transform } from 'stream';

export async function downloadMedia(msg: { message?: WAMessage['message'] }): Promise<Buffer | null> {
    const messageType = Object.keys(msg.message || {})[0];
    const messageContent = msg.message?.[messageType as keyof typeof msg.message];

    if (!messageContent) return null;

    // Determine media type
    let type: MediaType = 'image';
    if (messageType === 'imageMessage') type = 'image';
    else if (messageType === 'videoMessage') type = 'video';
    else if (messageType === 'stickerMessage') type = 'sticker';
    else if (messageType === 'documentMessage') type = 'document';
    else if (messageType === 'audioMessage') type = 'audio';
    else return null;

    try {
        // @ts-ignore - The types for messageContent are complex union types
        const stream = await downloadContentFromMessage(messageContent, type);
        let buffer = Buffer.from([]);

        for await (const chunk of stream) {
            buffer = Buffer.concat([buffer, chunk]);
        }
        return buffer;
    } catch (error) {
        console.error('Failed to download media:', error);
        return null;
    }
}
