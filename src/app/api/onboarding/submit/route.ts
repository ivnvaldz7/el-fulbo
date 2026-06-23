import { NextResponse } from 'next/server';
import { safeJson } from '@/lib/api-helpers';
import {
  submitAdminOnboardingStats,
  submitOnboardingStats,
  type SubmitOnboardingStatsInput,
} from '@/lib/services/onboarding.service';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  const body = await safeJson(request);
  const { asAdmin, ...rawInput } = body as Record<string, unknown>;
  const input = rawInput as SubmitOnboardingStatsInput;
  const supabase = await createServerSupabaseClient();
  const result =
    asAdmin === true
      ? await submitAdminOnboardingStats(supabase, input)
      : await submitOnboardingStats(supabase, input);

  if (!result.ok) {
    return NextResponse.json(result, { status: 400 });
  }

  return NextResponse.json(result);
}
