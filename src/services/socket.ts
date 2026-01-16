import makeWASocket, { DisconnectReason, useMultiFileAuthState } from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import qrcode from 'qrcode-terminal';
import { baileysConfig } from '../config/baileys.js';
import { handleMessage } from '../handlers/message.js';
import { logger } from '../utils/logger.js';

export async function connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');

    const sock = makeWASocket({
        auth: state,
        ...baileysConfig,
    });

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            qrcode.generate(qr, { small: true });
        }

        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
            logger.info({ err: lastDisconnect?.error, reconnecting: shouldReconnect }, 'Connection closed');

            if (shouldReconnect) {
                // Determine if it's the specific 515 error to advise user or just retry
                const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
                if (statusCode === 515) {
                    logger.warn('Received Stream Error 515. Restarting...');
                }

                connectToWhatsApp();
            }
        } else if (connection === 'open') {
            logger.info('Opened connection');
            console.log('Bot is ready!');
        }
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('messages.upsert', async (m) => {
        await handleMessage(sock, m.messages);
    });
}
