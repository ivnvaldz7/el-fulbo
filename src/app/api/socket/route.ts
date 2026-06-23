import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json(
    { message: 'Socket.io endpoint. Use Supabase Realtime for realtime features.' },
    { status: 200 }
  );
}

export async function POST() {
  return NextResponse.json(
    { message: 'Socket.io endpoint. Use Supabase Realtime for realtime features.' },
    { status: 200 }
  );
}
