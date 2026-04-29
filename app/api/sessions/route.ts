import { NextResponse } from 'next/server';
import { sessionManager } from '@/src/services/session-manager';

export const runtime = 'nodejs';

export async function GET() {
  const sessions = await sessionManager.listSessions();
  return NextResponse.json({ sessions });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as { name?: string };
    const session = await sessionManager.createSession(body.name ?? '');
    return NextResponse.json({ session }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create session.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
