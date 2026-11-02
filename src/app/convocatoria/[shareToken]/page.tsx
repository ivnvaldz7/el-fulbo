import { SharedGroupAttendanceClient } from '@/components/events/shared-group-attendance-client';

export default async function SharedGroupAttendancePage({ params }: { params: Promise<{ shareToken: string }> }) {
  const { shareToken } = await params;
  return <SharedGroupAttendanceClient shareToken={shareToken} />;
}
