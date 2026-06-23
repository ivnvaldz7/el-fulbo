
import React, { useState } from 'react';

interface ConfirmationModalProps {
  title: string;
  message: string;
  onConfirm: (motive?: string) => void;
  onCancel: () => void;
  loading: boolean;
  showMotiveField?: boolean;
}

export function ConfirmationModal({
  title,
  message,
  onConfirm,
  onCancel,
  loading,
  showMotiveField = false,
}: ConfirmationModalProps) {
  const [motive, setMotive] = useState('');

  const handleConfirm = () => {
    onConfirm(showMotiveField ? motive : undefined);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 p-4">
      <div className="w-full max-w-md rounded-lg border border-white/10 bg-black/70 p-6 shadow-lg">
        <h2 className="mb-4 font-headline text-2xl font-black italic uppercase tracking-tight text-white">{title}</h2>
        <p className="mb-6 text-white/80">{message}</p>

        {showMotiveField && (
          <div className="mb-6">
            <label htmlFor="motive" className="mb-2 block font-mono text-[10px] font-bold uppercase text-white/60">
              Motivo de la cancelación (opcional)
            </label>
            <textarea
              id="motive"
              value={motive}
              onChange={(e) => setMotive(e.target.value)}
              rows={4}
              className="w-full rounded border border-white/10 bg-white/5 p-3 text-white placeholder-white/30 focus:border-pitch-green focus:ring-pitch-green"
              placeholder="Introduce un motivo aquí..."
              disabled={loading}
            ></textarea>
          </div>
        )}

        <div className="flex justify-end space-x-4">
          <button
            onClick={onCancel}
            className="flex h-10 items-center justify-center rounded-md border border-white/20 px-4 font-bold text-white/80 transition-colors hover:bg-white/10 disabled:opacity-50"
            disabled={loading}
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            className="flex h-10 items-center justify-center rounded-md bg-red-600 px-4 font-bold text-white transition-colors hover:bg-red-700 disabled:opacity-50"
            disabled={loading}
          >
            {loading ? 'Confirmando...' : 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  );
}
