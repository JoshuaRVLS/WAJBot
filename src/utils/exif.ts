import webpmux from 'node-webpmux';
const { Image } = webpmux;

export async function addExif(imageBuffer: Buffer, pack: string, author: string): Promise<Buffer> {
    const img = new Image();
    await img.load(imageBuffer);

    // WhatsApp Sticker Exif Format
    const json = {
        "sticker-pack-id": "com.wajbot.sticker",
        "sticker-pack-name": pack,
        "sticker-pack-publisher": author,
        "emojis": ["🤖"]
    };

    const exifAttr = Buffer.from([0x49, 0x49, 0x2A, 0x00, 0x08, 0x00, 0x00, 0x00, 0x01, 0x00, 0x41, 0x57, 0x07, 0x00, 0x00, 0x00, 0x00, 0x00, 0x16, 0x00, 0x00, 0x00]);
    const jsonBuffer = Buffer.from(JSON.stringify(json), 'utf-8');
    const exif = Buffer.concat([exifAttr, jsonBuffer]);

    exif.writeUInt32LE(jsonBuffer.length, 14);

    img.exif = exif;

    return await img.save(null);
}
