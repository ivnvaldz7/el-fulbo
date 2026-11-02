import { redirect } from 'next/navigation';
import { AppSectionSelector } from '@/components/home/app-section-selector';
import { ImmersiveScreen } from '@/components/ui/immersive-screen';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export default async function HomePage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/welcome');

  return (
    <ImmersiveScreen align="center" animated contentClassName="w-full">
      <AppSectionSelector isAuthenticated />
    </ImmersiveScreen>
  );
}
