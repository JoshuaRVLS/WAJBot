import { promises as fs } from 'node:fs';
import path from 'node:path';
import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import QRCode from 'qrcode';
import { baileysConfig } from '../config/baileys';
import { handleMessage } from '../handlers/message';
import { addIgnoredMessageId } from '../utils/ignore';

type SessionStatus =
  | 'offline'
  | 'connecting'
  | 'awaiting_scan'
  | 'online'
  | 'restarting'
  | 'error';

type SessionRecord = {
  id: string;
  name: string;
  status: SessionStatus;
  qr: string | null;
  qrDataUrl: string | null;
  pairingCode: string | null;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
  authDir: string;
  pid: number | null;
};

const sessionId = process.argv[2];
if (!sessionId) {
  throw new Error('sessionId is required');
}

const sessionStorePath = path.join(process.cwd(), 'data', 'sessions.json');
let reconnectTimeout: NodeJS.Timeout | null = null;
let socketRef: ReturnType<typeof makeWASocket> | null = null;
let consecutive405Failures = 0;

const loadSessions = async () => {
  const raw = await fs.readFile(sessionStorePath, 'utf8');
  const parsed = JSON.parse(raw) as { sessions: SessionRecord[] };
  return parsed.sessions;
};

const saveSessions = async (sessions: SessionRecord[]) => {
  await fs.writeFile(sessionStorePath, JSON.stringify({ sessions }, null, 2), 'utf8');
};

const patchSession = async (patch: Partial<SessionRecord>) => {
  const sessions = await loadSessions();
  const index = sessions.findIndex((session) => session.id === sessionId);
  if (index === -1) {
    throw new Error(`Session ${sessionId} not found.`);
  }

  sessions[index] = {
    ...sessions[index],
    ...patch,
    updatedAt: new Date().toISOString(),
  };

  await saveSessions(sessions);
  return sessions[index];
};

const getSession = async () => {
  const sessions = await loadSessions();
  const session = sessions.find((item) => item.id === sessionId);
  if (!session) {
    throw new Error(`Session ${sessionId} not found.`);
  }
  return session;
};

const clearReconnectTimeout = () => {
  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
    reconnectTimeout = null;
  }
};

const scheduleReconnect = (delayMs: number) => {
  clearReconnectTimeout();
  reconnectTimeout = setTimeout(() => {
    void startWorker();
  }, delayMs);
};

const cleanupAndExit = async (status: SessionStatus = 'offline') => {
  clearReconnectTimeout();
  if (socketRef) {
    socketRef.end(undefined);
    socketRef = null;
  }

  try {
    await patchSession({
      pid: null,
      status,
      qr: null,
      qrDataUrl: null,
      pairingCode: null,
    });
  } catch {
    // Ignore cleanup write failures on shutdown.
  }

  process.exit(0);
};

const startWorker = async () => {
  clearReconnectTimeout();
  const session = await getSession();

  const { state, saveCreds } = await useMultiFileAuthState(session.authDir);
  await patchSession({
    pid: process.pid,
    status: 'connecting',
    qr: null,
    qrDataUrl: null,
    pairingCode: null,
    lastError: null,
  });

  const socket = makeWASocket({
    auth: state,
    ...baileysConfig,
  });

  socketRef = socket;

  const originalSendMessage = socket.sendMessage.bind(socket);
  socket.sendMessage = async (...args) => {
    const sentMessage = await originalSendMessage(...args);
    if (sentMessage?.key?.id) {
      addIgnoredMessageId(sentMessage.key.id);
    }
    return sentMessage;
  };

  socket.ev.on('connection.update', async (update) => {
    if (socketRef !== socket) return;

    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      const qrDataUrl = await QRCode.toDataURL(qr).catch(() => null);
      await patchSession({
        status: 'awaiting_scan',
        qr,
        qrDataUrl,
        lastError: null,
      });
    }

    if (connection === 'open') {
      consecutive405Failures = 0;
      await patchSession({
        status: 'online',
        qr: null,
        qrDataUrl: null,
        lastError: null,
      });
      return;
    }

    if (connection === 'close') {
      socketRef = null;
      const statusCode = (lastDisconnect?.error as Boom | undefined)?.output?.statusCode;
      const lastError = lastDisconnect?.error instanceof Error ? lastDisconnect.error.message : 'Connection closed';

      if (statusCode === DisconnectReason.loggedOut) {
        await patchSession({
          pid: null,
          status: 'offline',
          qr: null,
          qrDataUrl: null,
          lastError,
        });
        process.exit(0);
      }

      if (statusCode === 405) {
        consecutive405Failures += 1;
        const delayMs = Math.min(60000, consecutive405Failures * 5000);
        await patchSession({
          status: 'error',
          lastError: `Connection rejected with 405. Retrying in ${Math.round(delayMs / 1000)}s.`,
          qr: null,
          qrDataUrl: null,
        });
        scheduleReconnect(delayMs);
        return;
      }

      await patchSession({
        status: 'restarting',
        lastError,
        qr: null,
        qrDataUrl: null,
      });
      scheduleReconnect(2000);
    }
  });

  socket.ev.on('creds.update', saveCreds);
  socket.ev.on('messages.upsert', async (payload) => {
    await handleMessage(socket, payload.messages, sessionId);
  });
};

process.on('SIGTERM', () => {
  void cleanupAndExit();
});

process.on('SIGINT', () => {
  void cleanupAndExit();
});

void startWorker();
