import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { ExportPageClient } from './export-page-client';

export default async function ExportPage({ params }: { params: { id: string } }) {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/welcome');

  const [isAdminRes, isOwnerRes] = await Promise.all([
    supabase.rpc('is_group_admin', { gid: params.id }),
    supabase.rpc('is_group_owner', { gid: params.id }),
  ]);

  if (!isAdminRes.data && !isOwnerRes.data) {
    redirect(`/groups/${params.id}/dashboard`);
  }

  const { data: group } = await supabase
    .from('groups')
    .select('name')
    .eq('id', params.id)
    .single();

  return (
    <ExportPageClient
      groupId={params.id}
      groupName={(group?.name as string | undefined) ?? 'el grupo'}
    />
  );
}
