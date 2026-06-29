'use client';

import { useState } from 'react';
import { Share2 } from 'lucide-react';
import { ShareEventModal } from './share-event-modal';

interface ShareEventButtonProps {
  groupId: string;
  eventId: string;
  eventName: string;
}

export function ShareEventButton({ groupId, eventId, eventName }: ShareEventButtonProps) {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="btn-interactive mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-white/10 bg-black/30 px-4 py-4 font-headline text-sm font-bold uppercase text-white/70 hover:border-white/30 hover:text-white"
      >
        <Share2 className="h-5 w-5" />
        Compartir partido
      </button>

      <ShareEventModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        groupId={groupId}
        eventId={eventId}
        eventName={eventName}
      />
    </>
  );
}
