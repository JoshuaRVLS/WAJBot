import { SocketConfig } from '@whiskeysockets/baileys';
import { logger } from '../utils/logger.js';

export const baileysConfig: Partial<SocketConfig> = {
    logger: logger,
    printQRInTerminal: false,
    browser: ['Ubuntu', 'Chrome', '20.0.04'],
    syncFullHistory: false,
    connectTimeoutMs: 60000,
    retryRequestDelayMs: 2000,
};
