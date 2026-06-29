'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import type { RapportinoImmagine } from '@/types';
const MAX_IMAGES = 5;

interface PendingImage {
  id: string;
  file: File;
  previewUrl: string;
}

interface Props {
  rapportinoId?: string;
  /** Immagini in attesa di upload (creazione nuovo rapportino) */
  pendingImages: PendingImage[];
  onPendingImagesChange: (images: PendingImage[]) => void;
  /** Immagini già salvate (modifica) */
  existingImages?: RapportinoImmagine[];
  onExistingImagesChange?: (images: RapportinoImmagine[]) => void;
  disabled?: boolean;
}

export default function RapportinoImageUpload({
  rapportinoId,
  pendingImages,
  onPendingImagesChange,
  existingImages = [],
  onExistingImagesChange,
  disabled = false,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const totalCount = existingImages.length + pendingImages.length;

  const revokePendingUrls = useCallback((items: PendingImage[]) => {
    items.forEach((p) => URL.revokeObjectURL(p.previewUrl));
  }, []);

  useEffect(() => {
    return () => revokePendingUrls(pendingImages);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;

    const remaining = MAX_IMAGES - totalCount;
    if (remaining <= 0) {
      toast.error(`Massimo ${MAX_IMAGES} immagini per rapportino`);
      e.target.value = '';
      return;
    }

    const toAdd = files.slice(0, remaining);
    if (files.length > remaining) {
      toast.info(`Aggiunte ${remaining} immagini (limite ${MAX_IMAGES})`);
    }

    if (rapportinoId) {
      setUploading(true);
      try {
        const uploaded: RapportinoImmagine[] = [];
        for (const file of toAdd) {
          const img = await api.uploadRapportinoImmagine(rapportinoId, file);
          uploaded.push(img);
        }
        onExistingImagesChange?.([...existingImages, ...uploaded]);
        toast.success(uploaded.length === 1 ? 'Immagine caricata' : `${uploaded.length} immagini caricate`);
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : 'Errore nel caricamento');
      } finally {
        setUploading(false);
      }
    } else {
      const newPending: PendingImage[] = toAdd.map((file) => ({
        id: crypto.randomUUID(),
        file,
        previewUrl: URL.createObjectURL(file),
      }));
      onPendingImagesChange([...pendingImages, ...newPending]);
    }

    e.target.value = '';
  };

  const removePending = (id: string) => {
    const item = pendingImages.find((p) => p.id === id);
    if (item) URL.revokeObjectURL(item.previewUrl);
    onPendingImagesChange(pendingImages.filter((p) => p.id !== id));
  };

  const removeExisting = async (imageId: string) => {
    if (!rapportinoId) return;
    try {
      await api.deleteRapportinoImmagine(rapportinoId, imageId);
      onExistingImagesChange?.(existingImages.filter((img) => img.id !== imageId));
      toast.success('Immagine rimossa');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Errore nella rimozione');
    }
  };

  return (
    <section className="rounded-md border border-dashed border-input p-4">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-bold text-foreground">
            Foto intervento <span className="font-normal text-muted-foreground">(opzionale)</span>
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Max {MAX_IMAGES} foto, compresse automaticamente. JPEG, PNG, WebP.
          </p>
        </div>
        <span className="shrink-0 text-xs text-muted-foreground">{totalCount}/{MAX_IMAGES}</span>
      </div>

      {(existingImages.length > 0 || pendingImages.length > 0) && (
        <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {existingImages.map((img) => (
            <div key={img.id} className="group relative aspect-square overflow-hidden rounded-lg border border-input bg-muted">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.url || `/api/rapportini/${rapportinoId}/immagini/${img.id}`}
                alt={img.caption || 'Foto intervento'}
                className="h-full w-full object-cover"
              />
              {!disabled && (
                <button
                  type="button"
                  onClick={() => removeExisting(img.id)}
                  className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100"
                  aria-label="Rimuovi immagine"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          ))}
          {pendingImages.map((p) => (
            <div key={p.id} className="group relative aspect-square overflow-hidden rounded-lg border border-input bg-muted">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.previewUrl} alt="Anteprima" className="h-full w-full object-cover" />
              {!disabled && (
                <button
                  type="button"
                  onClick={() => removePending(p.id)}
                  className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100"
                  aria-label="Rimuovi anteprima"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {totalCount < MAX_IMAGES && !disabled && (
        <>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
            multiple
            capture="environment"
            className="hidden"
            onChange={handleFileSelect}
            disabled={uploading}
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="flex w-full items-center justify-center gap-2 rounded-md border border-input bg-background px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-50"
          >
            {uploading ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                Caricamento…
              </>
            ) : (
              <>
                <svg className="h-5 w-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Aggiungi foto
              </>
            )}
          </button>
        </>
      )}
    </section>
  );
}

export type { PendingImage };
