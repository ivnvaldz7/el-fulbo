'use client';

import { useEffect } from 'react';
import { X, Copy, Share2, MessageCircle } from 'lucide-react';
import toast from 'react-hot-toast';

interface ShareEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupId: string;
  eventId: string;
  eventName: string;
}

const toastDarkStyle = {
  background: '#1A1A1A',
  color: '#fff',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '8px',
  fontSize: '14px',
};

export function ShareEventModal({
  isOpen,
  onClose,
  groupId,
  eventId,
  eventName,
}: ShareEventModalProps) {
  const shareUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/groups/${groupId}/events/${eventId}`;
  const shareText = `¡Confirmá tu asistencia! ${eventName}`;

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success('Link copiado', { icon: '📋', duration: 2000, style: toastDarkStyle });
      onClose();
    } catch (err) {
      toast.error('No se pudo copiar el link', { style: toastDarkStyle });
    }
  };

  const handleNativeShare = async () => {
    if (typeof navigator.share !== 'function') {
      toast.error('Compartir no está disponible en este navegador', { style: toastDarkStyle });
      return;
    }

    try {
      await navigator.share({
        title: 'Confirmar asistencia',
        text: shareText,
        url: shareUrl,
      });
      onClose();
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        toast.error('No se pudo compartir', { style: toastDarkStyle });
      }
    }
  };

  const handleWhatsAppShare = () => {
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(`${shareText}\n${shareUrl}`)}`;
    window.open(whatsappUrl, '_blank');
    onClose();
  };

  if (!isOpen) return null;

  const showNativeShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
      onClick={handleBackdropClick}
    >
      <div className="w-full max-w-md animate-fade-slide-up border border-white/10 bg-[#1a1a1a] p-6 shadow-lg">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <h2 className="font-headline text-2xl font-black italic uppercase tracking-tight text-white">
            Compartir partido
          </h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-white/60 transition-colors hover:bg-white/10 hover:text-white"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Link display */}
        <div className="mb-6 rounded-lg border border-white/10 bg-black/30 p-3">
          <p className="font-mono text-xs text-white/60 break-all">{shareUrl}</p>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col gap-3">
          {/* Copy link - Primary action */}
          <button
            onClick={handleCopyLink}
            className="btn-interactive flex min-h-12 items-center justify-center gap-2 bg-pitch-green px-4 font-headline text-base font-bold uppercase text-black hover:brightness-110"
          >
            <Copy className="h-5 w-5" />
            Copiar link
          </button>

          {/* Native share - Secondary action (only if available) */}
          {showNativeShare && (
            <button
              onClick={handleNativeShare}
              className="btn-interactive flex min-h-12 items-center justify-center gap-2 border border-white/10 bg-black/30 px-4 font-headline text-base font-bold uppercase text-white hover:border-white/30 hover:bg-white/10"
            >
              <Share2 className="h-5 w-5" />
              Compartir
            </button>
          )}

          {/* WhatsApp - Tertiary action */}
          <button
            onClick={handleWhatsAppShare}
            className="btn-interactive flex min-h-12 items-center justify-center gap-2 bg-[#25D366] px-4 font-headline text-base font-bold uppercase text-black hover:brightness-110"
          >
            <MessageCircle className="h-5 w-5" />
            WhatsApp
          </button>
        </div>
      </div>
    </div>
  );
}
