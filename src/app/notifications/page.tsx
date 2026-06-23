import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { NotificationsPageClient } from './notifications-page-client';

export default async function NotificationsPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/welcome');

  return <NotificationsPageClient />;
}
