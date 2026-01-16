import makeWASocket, { DisconnectReason, useMultiFileAuthState } from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import qrcode from 'qrcode-terminal';
import { baileysConfig } from '../config/baileys.js';
import { handleMessage } from '../handlers/message.js';
import { logger } from '../utils/logger.js';
import { addIgnoredMessageId } from '../utils/ignore.js';
import { getIO } from '../utils/socket.js';

let sock: ReturnType<typeof makeWASocket> | undefined;
let currentStatus = 'Offline';

export const getBotStatus = () => currentStatus;

// Connection Controls
export const disconnectWhatsApp = async () => {
    if (sock) {
        logger.info('Disconnecting WhatsApp...');
        sock.end(undefined);
        sock = undefined;
        currentStatus = 'Offline';
        try { getIO().emit('status_update', 'Offline'); } catch (e) { }
    }
};

export const reconnectWhatsApp = async () => {
    currentStatus = 'Restarting...';
    try { getIO().emit('status_update', 'Restarting...'); } catch (e) { }
    await disconnectWhatsApp();
    connectToWhatsApp();
};

export async function connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');

    currentStatus = 'Connecting...';
    try { getIO().emit('status_update', 'Connecting...'); } catch (e) { }

    const socket = makeWASocket({
        auth: state,
        ...baileysConfig,
    });

    sock = socket;

    // Intercept sendMessage to assume "author usage" loop prevention
    const originalSendMessage = socket.sendMessage;
    socket.sendMessage = async (...args) => {
        const msg = await originalSendMessage(...args);
        if (msg?.key?.id) {
            addIgnoredMessageId(msg.key.id);
        }
        return msg;
    };

    socket.ev.on('connection.update', (update) => {
        // Check if this event is for the current active socket
        if (sock !== socket) return;

        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            qrcode.generate(qr, { small: true });
        }

        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
            logger.info({ err: lastDisconnect?.error, reconnecting: shouldReconnect }, 'Connection closed');

            // Only set Offline if we are not intentionally restarting/reconnecting immediately
            if (!shouldReconnect) {
                currentStatus = 'Offline';
                try { getIO().emit('status_update', 'Offline'); } catch (e) { }
            }

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
            currentStatus = 'Online';
            try { getIO().emit('status_update', 'Online'); } catch (e) { }
        }
    });

    socket.ev.on('creds.update', saveCreds);

    socket.ev.on('messages.upsert', async (m) => {
        await handleMessage(socket, m.messages);
    });
}
