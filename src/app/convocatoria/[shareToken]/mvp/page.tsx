import { SharedMvpVoteClient } from '@/components/events/shared-mvp-vote-client';

export default async function SharedMvpVotePage({
  params,
  searchParams,
}: {
  params: Promise<{ shareToken: string }>;
  searchParams: Promise<{ eventId?: string }>;
}) {
  const [{ shareToken }, { eventId }] = await Promise.all([params, searchParams]);
  return <SharedMvpVoteClient shareToken={shareToken} eventId={eventId ?? null} />;
}
