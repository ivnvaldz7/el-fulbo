import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getAdminTasksDetail } from '@/lib/services/admin-tasks.service';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { TaskActions } from './task-actions';
import { ImmersiveScreen } from '@/components/ui/immersive-screen';

function formatRelative(dateIso: string) {
  const diffDays = Math.max(
    0,
    Math.floor((Date.now() - new Date(dateIso).getTime()) / (1000 * 60 * 60 * 24)),
  );

  if (diffDays === 0) return 'hoy';
  if (diffDays === 1) return 'hace 1 día';
  return `hace ${diffDays} días`;
}

function TaskSection({
  title,
  items,
  emptyCopy,
  taskType,
}: {
  title: string;
  items: { id: string; playerName: string; createdAt: string; overdue: boolean }[];
  emptyCopy: string;
  taskType: 'cards_new' | 'revisions' | 'reintegrations';
}) {
  return (
    <section className="border border-white/10 bg-concrete-overlay p-5">
      <div className="flex items-center justify-between gap-4">
        <h2 className="font-headline text-xl font-black italic uppercase text-white">{title}</h2>
        <span className="font-mono text-[10px] font-bold uppercase text-white/40">
          {items.length} TOTAL
        </span>
      </div>

      {items.length === 0 ? (
        <p className="mt-4 font-mono text-[10px] font-bold uppercase text-white/20 italic">{emptyCopy}</p>
      ) : (
        <ul className="mt-6 divide-y divide-white/5 border-y border-white/5">
          {items.map((item) => (
            <li key={item.id} className="py-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-headline text-lg font-black italic uppercase text-white tracking-tight">{item.playerName}</p>
                  <p className="font-mono text-[10px] font-bold uppercase text-pitch-green mt-1">{formatRelative(item.createdAt)}</p>
                </div>
                {item.overdue ? (
                  <span className="bg-amber-400 px-2 py-0.5 font-mono text-[10px] font-bold uppercase text-black">
                    DEMORADO
                  </span>
                ) : null}
              </div>
              <div className="mt-4">
                <TaskActions taskType={taskType} itemId={item.id} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default async function AdminTasksPage({ params }: { params: { id: string } }) {
  const supabase = createServerSupabaseClient();
  const detail = await getAdminTasksDetail(supabase, params.id);

  if (!detail.ok) {
    redirect(`/groups/${params.id}/dashboard`);
  }

  return (
    <ImmersiveScreen align="center" className="flex-col">
      <header className="fixed top-0 z-30 flex h-16 w-full max-w-[390px] items-center justify-between border-b-2 border-white/10 bg-absolute-dark px-4">
        <Link href={`/groups/${params.id}/dashboard`} className="text-white active:scale-95 transition-transform">
          <span className="material-symbols-outlined text-pitch-green">arrow_back</span>
        </Link>
        <h1 className="font-headline text-xl font-black italic uppercase tracking-tighter text-white">ADMIN</h1>
        <div className="w-6"></div>
      </header>

      <main className="mt-16 flex w-full max-w-[390px] flex-col px-6">
        <section className="py-6">
          <h2 className="font-headline text-3xl font-bold uppercase italic leading-none text-white">PENDIENTES</h2>
          <p className="font-mono text-[10px] uppercase text-pitch-green mt-1">Gestión del grupo</p>
        </section>

        <div className="space-y-4 pb-12">
          <TaskSection
            title="Reintegros"
            items={detail.data.reintegrations}
            emptyCopy="No hay solicitudes pendientes."
            taskType="reintegrations"
          />
          <TaskSection
            title="Cartas nuevas"
            items={detail.data.cardsNew}
            emptyCopy="No hay cartas para aprobar."
            taskType="cards_new"
          />
          <TaskSection
            title="Revisiones"
            items={detail.data.revisions}
            emptyCopy="No hay revisiones pendientes."
            taskType="revisions"
          />
        </div>
      </main>
    </ImmersiveScreen>
  );
}
