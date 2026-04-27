import Link from 'next/link';
import { JoinForm } from './join-form';

export default function JoinPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col justify-center px-5 py-10">
      <Link href="/" className="mb-8 text-sm font-black text-cancha">
        Volver
      </Link>
      <h1 className="text-4xl font-black text-noche">Unite con un codigo</h1>
      <p className="mt-3 text-neutral-700">
        No tenes codigo? Pedile el link a quien organiza el grupo.
      </p>
      <JoinForm />
    </main>
  );
}
