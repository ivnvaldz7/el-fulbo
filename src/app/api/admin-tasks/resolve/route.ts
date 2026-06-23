import { NextResponse } from 'next/server';
import {
  approveInitialStats,
  approveReintegrationRequest,
  approveStatRevision,
  rejectInitialStats,
  rejectReintegrationRequest,
  rejectStatRevision,
} from '@/lib/services/admin-tasks.service';
import { createServerSupabaseClient } from '@/lib/supabase/server';

type Body = {
  taskType?: 'cards_new' | 'revisions' | 'reintegrations';
  decision?: 'approve' | 'reject';
  id?: string;
  note?: string | null;
};

export async function POST(request: Request) {
  let body;
  try {
    body = await request.json();
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: { code: 'VALIDATION_ERROR', message: 'JSON malformado.' } },
      { status: 400 }
    );
  }
  const supabase = await createServerSupabaseClient();

  if (!body.taskType || !body.decision || !body.id) {
    return NextResponse.json(
      { ok: false, error: { code: 'VALIDATION_ERROR', message: 'Faltan datos para resolver el pendiente.' } },
      { status: 400 },
    );
  }

  let result;

  if (body.taskType === 'cards_new') {
    result =
      body.decision === 'approve'
        ? await approveInitialStats(supabase, body.id)
        : await rejectInitialStats(supabase, body.id, body.note ?? null);
  } else if (body.taskType === 'revisions') {
    result =
      body.decision === 'approve'
        ? await approveStatRevision(supabase, body.id)
        : await rejectStatRevision(supabase, body.id, body.note ?? null);
  } else {
    result =
      body.decision === 'approve'
        ? await approveReintegrationRequest(supabase, body.id)
        : await rejectReintegrationRequest(supabase, body.id, body.note ?? null);
  }

  if (!result.ok) {
    return NextResponse.json(result, { status: 400 });
  }

  return NextResponse.json(result);
}
