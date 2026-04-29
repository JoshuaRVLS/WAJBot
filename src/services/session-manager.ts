import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { promises as fs } from 'node:fs';
import path from 'node:path';

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

export type PublicSession = Omit<SessionRecord, 'authDir'>;

type SessionStorePayload = {
  sessions: SessionRecord[];
};

const dataDir = path.join(process.cwd(), 'data');
const authRootDir = path.join(process.cwd(), 'auth_info_baileys');
const sessionStorePath = path.join(dataDir, 'sessions.json');
const legacySessionId = 'default';
const legacySessionName = 'Default Session';

const toPublicSession = (session: SessionRecord): PublicSession => ({
  id: session.id,
  name: session.name,
  status: session.status,
  qr: session.qr,
  qrDataUrl: session.qrDataUrl,
  pairingCode: session.pairingCode,
  lastError: session.lastError,
  createdAt: session.createdAt,
  updatedAt: session.updatedAt,
  pid: session.pid,
});

const slugifyName = (value: string) => {
  const normalized = value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  return normalized || 'session';
};

class SessionManager {
  private sessions = new Map<string, SessionRecord>();
  private initPromise: Promise<void> | null = null;

  private async init() {
    if (!this.initPromise) {
      this.initPromise = (async () => {
        await fs.mkdir(dataDir, { recursive: true });
        await fs.mkdir(authRootDir, { recursive: true });

        try {
          const raw = await fs.readFile(sessionStorePath, 'utf8');
          const parsed = JSON.parse(raw) as SessionStorePayload;
          for (const session of parsed.sessions || []) {
            this.sessions.set(session.id, {
              ...session,
              status: session.status ?? 'offline',
              qr: session.qr ?? null,
              qrDataUrl: session.qrDataUrl ?? null,
              pairingCode: session.pairingCode ?? null,
              lastError: session.lastError ?? null,
              pid: session.pid ?? null,
            });
          }
        } catch (error) {
          const nodeError = error as NodeJS.ErrnoException;
          if (nodeError.code !== 'ENOENT') {
            throw error;
          }
        }

        await this.bootstrapDefaultSessions();
      })();
    }

    await this.initPromise;
  }

  private async writeStore() {
    const sessions = Array.from(this.sessions.values()).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    await fs.writeFile(sessionStorePath, JSON.stringify({ sessions }, null, 2), 'utf8');
  }

  private async persist() {
    await this.init();
    await this.writeStore();
  }

  private async bootstrapDefaultSessions() {
    if (this.sessions.size > 0) return;

    const now = new Date().toISOString();
    const legacyCredsPath = path.join(authRootDir, 'creds.json');

    try {
      await fs.access(legacyCredsPath);
      this.sessions.set(legacySessionId, {
        id: legacySessionId,
        name: legacySessionName,
        status: 'offline',
        qr: null,
        qrDataUrl: null,
        pairingCode: null,
        lastError: null,
        createdAt: now,
        updatedAt: now,
        authDir: authRootDir,
        pid: null,
      });
      await this.writeStore();
      return;
    } catch {
      this.sessions.set(legacySessionId, {
        id: legacySessionId,
        name: legacySessionName,
        status: 'offline',
        qr: null,
        qrDataUrl: null,
        pairingCode: null,
        lastError: null,
        createdAt: now,
        updatedAt: now,
        authDir: path.join(authRootDir, legacySessionId),
        pid: null,
      });
      await this.writeStore();
    }
  }

  private getRequiredSession(sessionId: string) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} tidak ditemukan.`);
    }
    return session;
  }

  private async patchSession(sessionId: string, patch: Partial<SessionRecord>) {
    const current = this.getRequiredSession(sessionId);
    const next: SessionRecord = {
      ...current,
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    this.sessions.set(sessionId, next);
    await this.persist();
    return next;
  }

  listSessions = async (): Promise<PublicSession[]> => {
    await this.init();
    return Array.from(this.sessions.values())
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map(toPublicSession);
  };

  createSession = async (name: string) => {
    await this.init();
    const trimmedName = name.trim();
    if (!trimmedName) {
      throw new Error('Nama session wajib diisi.');
    }

    const baseId = slugifyName(trimmedName);
    const id = this.sessions.has(baseId) ? `${baseId}-${randomUUID().slice(0, 8)}` : baseId;
    const now = new Date().toISOString();

    const session: SessionRecord = {
      id,
      name: trimmedName,
      status: 'offline',
      qr: null,
      qrDataUrl: null,
      pairingCode: null,
      lastError: null,
      createdAt: now,
      updatedAt: now,
      authDir: path.join(authRootDir, id),
      pid: null,
    };

    this.sessions.set(id, session);
    await this.persist();
    return toPublicSession(session);
  };

  startSession = async (sessionId: string) => {
    await this.init();
    const session = this.getRequiredSession(sessionId);

    if (session.pid) {
      return toPublicSession(session);
    }

    await this.patchSession(sessionId, {
      status: 'connecting',
      qr: null,
      qrDataUrl: null,
      pairingCode: null,
      lastError: null,
    });

    const child = spawn(
      process.execPath,
      ['--import', 'tsx', path.join(process.cwd(), 'src/services/session-worker.ts'), sessionId],
      {
        detached: true,
        stdio: 'ignore',
        cwd: process.cwd(),
      }
    );

    child.unref();

    const next = await this.patchSession(sessionId, {
      pid: child.pid ?? null,
      status: 'connecting',
    });

    return toPublicSession(next);
  };

  stopSession = async (sessionId: string) => {
    await this.init();
    const session = this.getRequiredSession(sessionId);

    if (session.pid) {
      try {
        process.kill(session.pid, 'SIGTERM');
      } catch {
        // Ignore if the process is already gone.
      }
    }

    const next = await this.patchSession(sessionId, {
      pid: null,
      status: 'offline',
      qr: null,
      qrDataUrl: null,
      pairingCode: null,
      lastError: null,
    });

    return toPublicSession(next);
  };

  deleteSession = async (sessionId: string) => {
    await this.init();
    const session = this.getRequiredSession(sessionId);

    await this.stopSession(sessionId);
    this.sessions.delete(sessionId);
    await this.persist();

    if (session.authDir !== authRootDir) {
      await fs.rm(session.authDir, { recursive: true, force: true });
    }
  };
}

declare global {
  // eslint-disable-next-line no-var
  var __wajbotSessionManager: SessionManager | undefined;
}

export const sessionManager = globalThis.__wajbotSessionManager ?? new SessionManager();

if (!globalThis.__wajbotSessionManager) {
  globalThis.__wajbotSessionManager = sessionManager;
}
