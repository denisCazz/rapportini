'use client';

import { useEffect, useRef, useState } from 'react';

interface SignaturePadProps {
  label: string;
  value?: string;
  required?: boolean;
  onChange: (value: string) => void;
}

export default function SignaturePad({ label, value, required = false, onChange }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isLandscape, setIsLandscape] = useState(true);
  const [showRotateHint, setShowRotateHint] = useState(false);

  const checkOrientation = () => {
    if (typeof window === 'undefined') return;
    const isSmallScreen = window.innerWidth <= 1024;
    const landscape = window.innerWidth >= window.innerHeight;
    setIsLandscape(!isSmallScreen || landscape);
  };

  useEffect(() => {
    if (!isOpen) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext('2d');
    if (!context) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.floor(rect.width * dpr);
    canvas.height = Math.floor(rect.height * dpr);
    context.scale(dpr, dpr);

    context.lineWidth = 2;
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.strokeStyle = '#0f172a';

    context.clearRect(0, 0, rect.width, rect.height);

    if (value) {
      const img = new Image();
      img.onload = () => {
        context.drawImage(img, 0, 0, rect.width, rect.height);
      };
      img.src = value;
    }
  }, [isOpen, value]);

  useEffect(() => {
    if (!isOpen) return;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setShowRotateHint(false);
      return;
    }

    checkOrientation();
    const handleResize = () => checkOrientation();

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    if (isLandscape) {
      setShowRotateHint(false);
      return;
    }

    const timer = window.setTimeout(() => {
      if (!isLandscape) {
        setShowRotateHint(true);
      }
    }, 5000);

    return () => {
      window.clearTimeout(timer);
    };
  }, [isOpen, isLandscape]);

  const getPoint = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();

    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  };

  const startDrawing = (event: React.PointerEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;

    const { x, y } = getPoint(event);
    context.beginPath();
    context.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (event: React.PointerEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;

    const { x, y } = getPoint(event);
    context.lineTo(x, y);
    context.stroke();
  };

  const stopDrawing = (event?: React.PointerEvent<HTMLCanvasElement>) => {
    if (event) event.preventDefault();
    if (!isDrawing) return;
    setIsDrawing(false);
  };

  const saveSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dataUrl = canvas.toDataURL('image/png');
    onChange(dataUrl);
    setIsOpen(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const context = canvas.getContext('2d');
      if (context) {
        const rect = canvas.getBoundingClientRect();
        context.clearRect(0, 0, rect.width, rect.height);
      }
    }
    onChange('');
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-100 mb-2">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 p-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <p className="text-xs text-gray-600 dark:text-gray-300">
            {value ? 'Firma acquisita' : 'Nessuna firma acquisita'}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setIsOpen(true)}
              className="px-3 py-2 text-xs font-semibold rounded-lg bg-primary-600 text-white hover:bg-primary-700"
            >
              {value ? 'Modifica firma' : 'Apri firma fullscreen'}
            </button>
            {value && (
              <button
                type="button"
                onClick={clearSignature}
                className="px-3 py-2 text-xs font-medium rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600"
              >
                Cancella
              </button>
            )}
          </div>
        </div>
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-[80]">
          <div className="absolute inset-0 bg-black/70" onClick={() => setIsOpen(false)} />
          <div className="absolute inset-0 p-3 sm:p-6">
            <div className="h-full w-full rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 shadow-2xl flex flex-col">
              <div className="px-4 py-3 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
                <h4 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white">{label}</h4>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-800"
                >
                  Chiudi
                </button>
              </div>

              <div className="flex-1 p-3 sm:p-4">
                {showRotateHint && (
                  <p className="mb-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800">
                    Firma con telefono in verticale.
                  </p>
                )}
                <canvas
                  ref={canvasRef}
                  className="w-full h-full rounded-xl bg-white touch-none"
                  onPointerDown={startDrawing}
                  onPointerMove={draw}
                  onPointerUp={stopDrawing}
                  onPointerLeave={stopDrawing}
                />
              </div>

              <div className="px-4 py-3 border-t border-gray-200 dark:border-slate-700 flex flex-col sm:flex-row gap-2 sm:justify-end">
                <button
                  type="button"
                  onClick={clearSignature}
                  className="px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-800"
                >
                  Cancella firma
                </button>
                <button
                  type="button"
                  onClick={saveSignature}
                  className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700"
                >
                  Salva firma
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
