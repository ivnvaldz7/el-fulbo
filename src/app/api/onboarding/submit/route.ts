import { NextResponse } from 'next/server';
import { submitOnboardingStats } from '@/lib/services/onboarding.service';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  const body = await request.json();
  const result = await submitOnboardingStats(createServerSupabaseClient(), body);

  if (!result.ok) {
    return NextResponse.json(result, { status: 400 });
  }

  return NextResponse.json(result);
}
