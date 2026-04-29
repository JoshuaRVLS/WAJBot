import { SocketConfig } from "@whiskeysockets/baileys";
import { logger } from "../utils/logger";

const WHATSAPP_VERSION: [number, number, number] = [2, 3000, 1037787856];
const WHATSAPP_BROWSER: [string, string, string] = [
  "Windows",
  "Chrome",
  "114.0.5735.198",
];

export const baileysConfig: Partial<SocketConfig> = {
  logger: logger,
  printQRInTerminal: false,
  version: WHATSAPP_VERSION,
  browser: WHATSAPP_BROWSER,
  defaultQueryTimeoutMs: undefined,
  markOnlineOnConnect: false,
  syncFullHistory: false,
  connectTimeoutMs: 60000,
  keepAliveIntervalMs: 30000,
  retryRequestDelayMs: 2000,
};
