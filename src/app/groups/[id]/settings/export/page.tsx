import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { ExportPageClient } from './export-page-client';

export default async function ExportPage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/welcome');
  const { id } = await params;

  const [isAdminRes, isOwnerRes] = await Promise.all([
    supabase.rpc('is_group_admin', { gid: id }),
    supabase.rpc('is_group_owner', { gid: id }),
  ]);

  if (!isAdminRes.data && !isOwnerRes.data) {
    redirect(`/groups/${id}/dashboard`);
  }

  const { data: group } = await supabase
    .from('groups')
    .select('name')
    .eq('id', id)
    .single();

  return (
    <ExportPageClient
      groupId={id}
      groupName={(group?.name as string | undefined) ?? 'el grupo'}
    />
  );
}
