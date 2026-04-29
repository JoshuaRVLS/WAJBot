import { NextResponse } from 'next/server';
import { sessionManager } from '@/src/services/session-manager';

export const runtime = 'nodejs';

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const session = await sessionManager.startSession(sessionId);
    return NextResponse.json({ session });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to start session.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
