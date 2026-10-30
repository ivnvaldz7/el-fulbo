import Link from 'next/link';
import { House, Swords, UsersRound } from 'lucide-react';
import { routes } from '@/lib/routes';

const items = [
  { href: routes.home, label: 'Inicio', icon: House, id: 'home' },
  { href: routes.groups, label: 'Grupos', icon: UsersRound, id: 'groups' },
  { href: routes.teams, label: 'Equipos', icon: Swords, id: 'teams' },
] as const;

export function AppSectionNav({ active }: { active: 'groups' | 'teams' }) {
  return (
    <nav aria-label="Navegación principal" className="mb-5 grid w-full grid-cols-3 gap-2">
      {items.map((item) => (
        <Link key={item.id} href={item.href} aria-current={active === item.id ? 'page' : undefined} className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/15 bg-black/45 px-2 font-headline text-xs font-black uppercase text-white/65 transition-colors hover:border-pitch-green hover:text-pitch-green aria-[current=page]:border-pitch-green aria-[current=page]:bg-pitch-green/15 aria-[current=page]:text-pitch-green">
          <item.icon className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{item.label}</span>
        </Link>
      ))}
    </nav>
  );
}
