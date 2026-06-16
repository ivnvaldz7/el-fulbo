'use client';

export function CopyAliasButton() {
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText('0000177509553009633357');
        alert('Alias/CBU copiado: 0000177509553009633357');
      }}
      className="btn-interactive flex min-h-12 flex-1 items-center justify-center bg-[#009EE3] px-4 font-headline text-sm font-bold uppercase italic text-white hover:brightness-110"
    >
      Copiar Alias MP
    </button>
  );
}
