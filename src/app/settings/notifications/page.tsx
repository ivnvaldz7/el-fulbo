import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getNotificationPreferences } from '@/lib/services/notifications.service';
import { NotificationSettingsClient } from './notification-settings-client';

export default async function NotificationSettingsPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/welcome');

  const prefsResult = await getNotificationPreferences(supabase, user.id);
  const prefs = prefsResult.ok ? prefsResult.data : null;

  const { data: isAdmin } = await supabase.rpc('is_group_admin', {
    gid: '00000000-0000-0000-0000-000000000000',
  }).maybeSingle();

  return (
    <NotificationSettingsClient
      initialPrefs={prefs ?? {
        pushEnabled: false,
        matchReminders: true,
        digestEnabled: false,
        digestFrequency: 'disabled',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      }}
      isAdmin={!!isAdmin}
    />
  );
}
