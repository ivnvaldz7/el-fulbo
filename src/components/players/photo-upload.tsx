'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import imageCompression from 'browser-image-compression';
import { Camera, Loader2 } from 'lucide-react';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';

type PhotoUploadProps = {
  playerId: string;
  groupId: string;
  currentPhotoUrl?: string | null;
  canEdit: boolean;
};

export function PhotoUpload({ playerId, groupId, currentPhotoUrl, canEdit }: PhotoUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const supabase = createBrowserSupabaseClient();

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);

      const options = {
        maxSizeMB: 0.5,
        maxWidthOrHeight: 800,
        useWebWorker: true,
      };

      const compressedFile = await imageCompression(file, options);
      const fileExt = file.name.split('.').pop();
      const fileName = `${groupId}/${playerId}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, compressedFile, { upsert: true });

      if (uploadError) {
        throw uploadError;
      }

      const { data } = supabase.storage.from('avatars').getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from('players')
        .update({ photo_url: data.publicUrl })
        .eq('id', playerId);

      if (updateError) {
        throw updateError;
      }

      router.refresh();
    } catch (error) {
      console.error('Error uploading photo:', error);
      alert('Hubo un error al subir la foto.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  if (!canEdit) return null;

  return (
    <div className="mt-4 flex flex-col items-center">
      <input
        type="file"
        accept="image/*"
        ref={fileInputRef}
        onChange={(e) => void handleFileChange(e)}
        className="hidden"
      />
      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={isUploading}
        className="flex items-center gap-2 rounded-full border border-white/20 bg-black/40 px-6 py-3 font-headline text-sm font-bold uppercase italic text-white transition-colors hover:bg-white/10 active:scale-95 disabled:opacity-50"
      >
        {isUploading ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <Camera className="h-5 w-5" />
        )}
        {isUploading ? 'Subiendo...' : currentPhotoUrl ? 'Cambiar Foto' : 'Subir Foto'}
      </button>
    </div>
  );
}
