'use client';

import { useCallback, useEffect, useMemo, useState, useTransition } from 'react';
import { Activity, LoaderCircle, MonitorUp, Plus, Power, ShieldCheck, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

type Session = {
  id: string;
  name: string;
  status: 'offline' | 'connecting' | 'awaiting_scan' | 'online' | 'restarting' | 'error';
  qr: string | null;
  qrDataUrl: string | null;
  pairingCode: string | null;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
};

type CommandSummary = {
  name: string;
  description: string;
  usage: string | null;
};

type DashboardProps = {
  commands: CommandSummary[];
};

const formatTimestamp = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toISOString().replace('T', ' ').slice(0, 16) + ' UTC';
};

const statusVariantMap: Record<Session['status'], 'neutral' | 'online' | 'connecting' | 'error'> = {
  offline: 'neutral',
  connecting: 'connecting',
  awaiting_scan: 'connecting',
  online: 'online',
  restarting: 'connecting',
  error: 'error',
};

export function SessionsDashboard({ commands }: DashboardProps) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [sessionName, setSessionName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const loadSessions = useCallback(async () => {
    try {
      const response = await fetch('/api/sessions', { cache: 'no-store' });
      if (!response.ok) throw new Error('Failed to load sessions.');
      const payload = (await response.json()) as { sessions: Session[] };
      setSessions(payload.sessions);
      setError(null);
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : 'Failed to load sessions.';
      setError(message);
    }
  }, []);

  useEffect(() => {
    void loadSessions();
    const interval = setInterval(() => void loadSessions(), 5000);
    return () => clearInterval(interval);
  }, [loadSessions]);

  const runAction = useCallback(async (input: RequestInfo, init?: RequestInit) => {
    const response = await fetch(input, init);
    if (!response.ok) {
      const payload = (await response.json().catch(() => ({ error: 'Request failed.' }))) as { error?: string };
      throw new Error(payload.error || 'Request failed.');
    }
    await loadSessions();
  }, [loadSessions]);

  const handleCreateSession = () => {
    startTransition(async () => {
      try {
        await runAction('/api/sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: sessionName }),
        });
        setSessionName('');
        setError(null);
      } catch (createError) {
        setError(createError instanceof Error ? createError.message : 'Failed to create session.');
      }
    });
  };

  const handleSessionAction = (sessionId: string, action: 'start' | 'stop' | 'delete') => {
    startTransition(async () => {
      try {
        const route = action === 'delete'
          ? `/api/sessions/${sessionId}`
          : `/api/sessions/${sessionId}/${action}`;

        await runAction(route, {
          method: action === 'delete' ? 'DELETE' : 'POST',
        });
        setError(null);
      } catch (actionError) {
        setError(actionError instanceof Error ? actionError.message : 'Failed to update session.');
      }
    });
  };

  const stats = useMemo(() => {
    const online = sessions.filter((session) => session.status === 'online').length;
    const connecting = sessions.filter((session) => ['connecting', 'awaiting_scan', 'restarting'].includes(session.status)).length;
    return {
      total: sessions.length,
      online,
      connecting,
    };
  }, [sessions]);

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
      <section className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
        <Card className="overflow-hidden">
          <CardHeader className="relative gap-3">
            <div className="absolute inset-x-0 top-0 h-24 bg-[radial-gradient(circle_at_top_left,rgba(255,108,55,0.35),transparent_55%),radial-gradient(circle_at_top_right,rgba(89,140,255,0.24),transparent_48%)]" />
            <Badge variant="neutral" className="relative w-fit">Next.js 16 Dashboard</Badge>
            <CardTitle className="relative text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">
              Multi-session control for WAJBot
            </CardTitle>
            <CardDescription className="relative max-w-2xl text-base leading-7">
              Session lifecycle, QR visibility, and command inventory in one dashboard. The web layer is designed around Next.js route handlers and a shadcn-style component system.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3">
            <MetricCard icon={ShieldCheck} label="Sessions" value={stats.total} tone="neutral" />
            <MetricCard icon={Power} label="Online" value={stats.online} tone="online" />
            <MetricCard icon={LoaderCircle} label="Connecting" value={stats.connecting} tone="connecting" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Create new session</CardTitle>
            <CardDescription>Provision a new auth directory and keep it ready for manual start.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              placeholder="e.g. trader-desk, sales-1, backup-bot"
              value={sessionName}
              onChange={(event) => setSessionName(event.target.value)}
            />
            <Button className="w-full" onClick={handleCreateSession} disabled={isPending || sessionName.trim().length === 0}>
              <Plus className="size-4" />
              Create Session
            </Button>
            {error ? <p className="text-sm text-rose-200">{error}</p> : null}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <div className="flex items-end justify-between">
            <div>
              <h2 className="text-2xl font-semibold tracking-[-0.03em]">Sessions Dashboard</h2>
              <p className="mt-1 text-sm text-[color:var(--muted-foreground)]">Polls route handlers every 5 seconds to refresh QR and status changes.</p>
            </div>
          </div>

          <div className="grid gap-4">
            {sessions.length === 0 ? (
              <Card>
                <CardContent className="flex min-h-44 flex-col items-center justify-center gap-3 text-center">
                  <MonitorUp className="size-10 text-[color:var(--muted-foreground)]" />
                  <div>
                    <p className="text-lg font-medium">No sessions yet</p>
                    <p className="text-sm text-[color:var(--muted-foreground)]">Create a session to initialize a dedicated Baileys auth state folder.</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              sessions.map((session) => (
                <Card key={session.id} className="overflow-hidden">
                  <CardHeader className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-3">
                        <CardTitle>{session.name}</CardTitle>
                        <Badge variant={statusVariantMap[session.status]}>{session.status.replace('_', ' ')}</Badge>
                      </div>
                      <CardDescription className="font-mono text-xs">{session.id}</CardDescription>
                      <p className="text-xs text-[color:var(--muted-foreground)]">Updated {formatTimestamp(session.updatedAt)}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button variant="secondary" size="sm" onClick={() => handleSessionAction(session.id, 'start')} disabled={isPending}>
                        <Power className="size-4" />
                        Start
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleSessionAction(session.id, 'stop')} disabled={isPending}>
                        Stop
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => handleSessionAction(session.id, 'delete')} disabled={isPending}>
                        <Trash2 className="size-4" />
                        Delete
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="grid gap-4 lg:grid-cols-[0.6fr_0.4fr]">
                    <div className="rounded-3xl border border-white/8 bg-black/20 p-4">
                      <p className="mb-2 text-xs uppercase tracking-[0.18em] text-[color:var(--muted-foreground)]">Runtime status</p>
                      <p className="text-sm leading-7 text-[color:var(--foreground)]">
                        {session.lastError
                          ? session.lastError
                          : session.status === 'awaiting_scan'
                            ? 'QR ready. Scan from WhatsApp Linked Devices.'
                            : session.status === 'online'
                              ? 'Session connected and listening for messages.'
                              : 'Session idle.'}
                      </p>
                    </div>
                    <div className="rounded-3xl border border-dashed border-white/12 bg-white/4 p-4">
                      <p className="mb-3 text-xs uppercase tracking-[0.18em] text-[color:var(--muted-foreground)]">Pairing / QR</p>
                      {session.qrDataUrl ? (
                        <img src={session.qrDataUrl} alt={`QR for ${session.name}`} className="mx-auto aspect-square w-full max-w-40 rounded-2xl bg-white p-3" />
                      ) : (
                        <p className="text-sm text-[color:var(--muted-foreground)]">
                          {session.pairingCode || 'No QR available yet.'}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Activity className="size-5 text-[color:var(--accent)]" />
              <div>
                <CardTitle>Command inventory</CardTitle>
                <CardDescription>Current bot commands available once a session is online.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {commands.map((command) => (
              <div key={command.name} className="rounded-2xl border border-white/8 bg-white/4 p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-medium text-[color:var(--foreground)]">.{command.name}</p>
                    <p className="mt-1 text-sm text-[color:var(--muted-foreground)]">{command.description}</p>
                  </div>
                  {command.usage ? <Badge variant="neutral">{command.usage}</Badge> : null}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Activity;
  label: string;
  value: number;
  tone: 'neutral' | 'online' | 'connecting';
}) {
  const toneClassName = tone === 'online'
    ? 'text-emerald-300'
    : tone === 'connecting'
      ? 'text-amber-200'
      : 'text-[color:var(--foreground)]';

  return (
    <div className="rounded-[24px] border border-white/8 bg-black/16 p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[color:var(--muted-foreground)]">{label}</p>
        <Icon className={`size-5 ${toneClassName}`} />
      </div>
      <p className="mt-6 text-4xl font-semibold tracking-[-0.04em]">{value}</p>
    </div>
  );
}
