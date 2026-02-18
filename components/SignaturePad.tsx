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
  const [allowVerticalSigning, setAllowVerticalSigning] = useState(false);

  const checkOrientation = () => {
    if (typeof window === 'undefined') return;
    const isSmallScreen = window.matchMedia('(max-width: 1024px)').matches;
    const orientationMedia = window.matchMedia('(orientation: landscape)').matches;
    const viewportLandscape = window.innerWidth >= window.innerHeight;
    const landscape = orientationMedia || viewportLandscape;
    setIsLandscape(!isSmallScreen || landscape);
  };

  const setupCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext('2d');
    if (!context) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();

    canvas.width = Math.floor(rect.width * dpr);
    canvas.height = Math.floor(rect.height * dpr);
    context.setTransform(1, 0, 0, 1, 0, 0);
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
  };

  useEffect(() => {
    if (!isOpen) return;
    setupCanvas();
  }, [isOpen, value]);

  useEffect(() => {
    if (!isOpen) return;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    checkOrientation();
    const handleResize = () => {
      checkOrientation();
      setupCanvas();
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setAllowVerticalSigning(false);
      return;
    }

    if (isLandscape) {
      setAllowVerticalSigning(true);
      return;
    }

    setAllowVerticalSigning(false);
    const timer = window.setTimeout(() => {
      setAllowVerticalSigning(true);
    }, 5000);

    return () => window.clearTimeout(timer);
  }, [isOpen, isLandscape]);

  const canSign = isLandscape || allowVerticalSigning;
  const showRotateHint = !isLandscape && !allowVerticalSigning;

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
    if (!canSign) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;

    canvas.setPointerCapture(event.pointerId);

    const { x, y } = getPoint(event);
    context.beginPath();
    context.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (event: React.PointerEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    if (!isDrawing) return;
    if (!canSign) return;

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

    if (event && canvasRef.current?.hasPointerCapture(event.pointerId)) {
      canvasRef.current.releasePointerCapture(event.pointerId);
    }

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
          <div className="absolute inset-0 p-2 sm:p-6">
            <div className="h-full w-full rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 shadow-2xl flex flex-col overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between shrink-0">
                <h4 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white">{label}</h4>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-800"
                >
                  Chiudi
                </button>
              </div>

              <div className="flex-1 min-h-0 p-3 sm:p-4 flex flex-col gap-3">
                {showRotateHint && (
                  <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-3 text-amber-800 shrink-0">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-amber-100 grid place-items-center animate-bounce">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5h8a1 1 0 011 1v12a1 1 0 01-1 1H8a1 1 0 01-1-1V6a1 1 0 011-1zm1 2v10h6V7H9z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-semibold animate-pulse">Ruota il telefono</p>
                        <p className="text-sm font-medium">Firma con telefono orizzontale. Tra 5 secondi puoi continuare anche in verticale.</p>
                      </div>
                    </div>
                  </div>
                )}
                <canvas
                  ref={canvasRef}
                  className="w-full flex-1 min-h-0 rounded-xl bg-white touch-none"
                  onPointerDown={startDrawing}
                  onPointerMove={draw}
                  onPointerUp={stopDrawing}
                  onPointerLeave={stopDrawing}
                  onPointerCancel={stopDrawing}
                />
              </div>

              <div className="px-4 py-3 border-t border-gray-200 dark:border-slate-700 flex flex-col sm:flex-row gap-2 sm:justify-end shrink-0 bg-white dark:bg-slate-900">
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
                  disabled={!canSign}
                  className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
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
