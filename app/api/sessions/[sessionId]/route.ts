import { NextResponse } from 'next/server';
import { sessionManager } from '@/src/services/session-manager';

export const runtime = 'nodejs';

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    await sessionManager.deleteSession(sessionId);
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete session.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
