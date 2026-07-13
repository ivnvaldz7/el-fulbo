import { createServerSupabaseClient } from '@/lib/supabase/server';
import { AppSectionSelector } from '@/components/home/app-section-selector';
import { ImmersiveScreen } from '@/components/ui/immersive-screen';

export default async function HomePage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const backgroundUrl = 'https://lh3.googleusercontent.com/aida-public/AB6AXuDlNS1eDv_IzL2vGpHKRro1Le2YdbLxFnMGcdG1awPpsfkVLA-RaRKpJ_c1QxaWJUyq-OM0ycjWV2GfvZbo9jWllP2RKDnMVW_nI7Gaex2TMRcjodIwx5tWRyQBccpSDqTehFArtzbVpcicOGrlq5l9GChuqI1gmXvlbybrqAMb77Euld3_aaXTnQTYYrCYPtlWWt438IlAq5-VPPGfzEdHuWXtqFC9SGXuZF28ykdTLeyI7aAJ4RtsgcgrWqNxayMg1uwvFg9KUX0';

  return (
    <ImmersiveScreen align="center" backgroundImage={`linear-gradient(to bottom, rgba(10,10,10,0.35) 0%, rgba(10,10,10,0.96) 100%), url("${backgroundUrl}")`}>
      <AppSectionSelector isAuthenticated={Boolean(user)} />
    </ImmersiveScreen>
  );
}