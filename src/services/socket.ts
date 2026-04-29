import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
} from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import qrcode from "qrcode-terminal";
import { baileysConfig } from "../config/baileys";
import { handleMessage } from "../handlers/message";
import { logger } from "../utils/logger";
import { addIgnoredMessageId } from "../utils/ignore";
import { getIO } from "../utils/socket";

let sock: ReturnType<typeof makeWASocket> | undefined;
let currentStatus = "Offline";
let reconnectTimeout: NodeJS.Timeout | undefined;
let consecutive405Failures = 0;

export const getBotStatus = () => currentStatus;

const clearReconnectTimeout = () => {
  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
    reconnectTimeout = undefined;
  }
};

const scheduleReconnect = (delayMs: number) => {
  clearReconnectTimeout();
  reconnectTimeout = setTimeout(() => {
    connectToWhatsApp();
  }, delayMs);
};

// Connection Controls
export const disconnectWhatsApp = async () => {
  clearReconnectTimeout();

  if (sock) {
    logger.info("Disconnecting WhatsApp...");
    sock.end(undefined);
    sock = undefined;
    currentStatus = "Offline";
    try {
      getIO().emit("status_update", "Offline");
      getIO().emit("qr_update", null);
    } catch (e) {}
  }
};

export const reconnectWhatsApp = async () => {
  currentStatus = "Restarting...";
  try {
    getIO().emit("status_update", "Restarting...");
  } catch (e) {}
  await disconnectWhatsApp();
  connectToWhatsApp();
};

export async function connectToWhatsApp() {
  clearReconnectTimeout();
  console.log("Initializing WhatsApp socket...");
  const { state, saveCreds } = await useMultiFileAuthState("auth_info_baileys");

  currentStatus = "Connecting...";
  try {
    getIO().emit("status_update", "Connecting...");
    getIO().emit("qr_update", null);
  } catch (e) {}

  const socket = makeWASocket({
    auth: state,
    ...baileysConfig,
  });

  if (state.creds.registered) {
    console.log("Session already registered. QR will not be shown unless auth is reset.");
  }

  sock = socket;

  if (!state.creds.registered && process.env.WA_PAIRING_PHONE) {
    const phone = process.env.WA_PAIRING_PHONE.replace(/\D/g, "");
    if (phone.length > 8) {
      try {
        const code = await socket.requestPairingCode(phone);
        console.log(`Pairing code for ${phone}: ${code}`);
      } catch (err) {
        console.error("Failed to request pairing code:", err);
      }
    } else {
      console.error("WA_PAIRING_PHONE is set but invalid. Use countrycode+number digits only.");
    }
  }

  // Intercept sendMessage to assume "author usage" loop prevention
  const originalSendMessage = socket.sendMessage;
  socket.sendMessage = async (...args) => {
    const msg = await originalSendMessage(...args);
    if (msg?.key?.id) {
      addIgnoredMessageId(msg.key.id);
    }
    return msg;
  };

  socket.ev.on("connection.update", (update) => {
    // Check if this event is for the current active socket
    if (sock !== socket) return;

    const { connection, lastDisconnect, qr } = update;
    if (connection || qr || lastDisconnect) {
      console.log("connection.update:", {
        connection,
        hasQr: Boolean(qr),
        lastDisconnect: Boolean(lastDisconnect),
      });
    }

    if (qr) {
      console.log("New WhatsApp QR received. Scan it from your terminal:");
      qrcode.generate(qr, { small: true });
      try {
        getIO().emit("qr_update", { qr });
      } catch (e) {}
    }

    if (connection === "close") {
      const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
      console.error("WhatsApp socket closed:", {
        statusCode,
        error: lastDisconnect?.error,
      });

      const shouldReconnect =
        statusCode !==
        DisconnectReason.loggedOut;
      logger.info(
        { err: lastDisconnect?.error, reconnecting: shouldReconnect },
        "Connection closed",
      );

      // Only set Offline if we are not intentionally restarting/reconnecting immediately
      if (!shouldReconnect) {
        currentStatus = "Offline";
        try {
          getIO().emit("status_update", "Offline");
          getIO().emit("qr_update", null);
        } catch (e) {}
      }

      if (!shouldReconnect) return;

      if (statusCode === 405) {
        consecutive405Failures += 1;
        const delayMs = Math.min(60000, consecutive405Failures * 5000);
        console.error(
          `Connection rejected with 405 before QR (attempt ${consecutive405Failures}). Retrying in ${Math.round(delayMs / 1000)}s...`,
        );
        scheduleReconnect(delayMs);
        return;
      }

      consecutive405Failures = 0;

      if (statusCode === 515) {
        logger.warn("Received Stream Error 515. Restarting...");
      }

      scheduleReconnect(2000);
    } else if (connection === "open") {
      logger.info("Opened connection");
      console.log("Bot is ready!");
      consecutive405Failures = 0;
      currentStatus = "Online";
      try {
        getIO().emit("status_update", "Online");
        getIO().emit("qr_update", null);
      } catch (e) {}
    }
  });

  socket.ev.on("creds.update", saveCreds);

  socket.ev.on("messages.upsert", async (m) => {
    await handleMessage(socket, m.messages);
  });
}
