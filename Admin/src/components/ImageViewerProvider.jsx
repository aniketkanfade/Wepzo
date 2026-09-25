import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

const ImageViewerContext = createContext(null);

export function useImageViewer() {
  return useContext(ImageViewerContext);
}

export function ImageViewerProvider({ children }) {
  const [state, setState] = useState({ open: false, images: [], index: 0, title: '' });

  const openViewer = useCallback((images, index = 0, title = '') => {
    const list = (Array.isArray(images) ? images : [images]).filter(Boolean);
    if (!list.length) return;
    setState({
      open: true,
      images: list,
      index: Math.max(0, Math.min(index, list.length - 1)),
      title,
    });
  }, []);

  const closeViewer = useCallback(() => {
    setState(s => ({ ...s, open: false }));
  }, []);

  const goPrev = useCallback(() => {
    setState(s => ({
      ...s,
      index: s.images.length ? (s.index - 1 + s.images.length) % s.images.length : 0,
    }));
  }, []);

  const goNext = useCallback(() => {
    setState(s => ({
      ...s,
      index: s.images.length ? (s.index + 1) % s.images.length : 0,
    }));
  }, []);

  useEffect(() => {
    if (!state.open) return;
    const onKey = (e) => {
      if (e.key === 'Escape') closeViewer();
      if (e.key === 'ArrowLeft') goPrev();
      if (e.key === 'ArrowRight') goNext();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [state.open, closeViewer, goPrev, goNext]);

  const current = state.images[state.index];

  return (
    <ImageViewerContext.Provider value={{ openViewer, closeViewer }}>
      {children}
      {state.open && current && (
        <div className="fixed inset-0 z-[20000] flex items-center justify-center p-4 sm:p-8">
          <div className="absolute inset-0 bg-black/40" onClick={closeViewer} />
          <button
            type="button"
            onClick={closeViewer}
            className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition"
            aria-label="Close"
          >
            <X size={22} />
          </button>

          {state.images.length > 1 && (
            <>
              <button
                type="button"
                onClick={goPrev}
                className="absolute left-3 sm:left-6 z-10 p-2.5 rounded-full bg-white/10 text-white hover:bg-white/20 transition"
                aria-label="Previous image"
              >
                <ChevronLeft size={24} />
              </button>
              <button
                type="button"
                onClick={goNext}
                className="absolute right-3 sm:right-6 z-10 p-2.5 rounded-full bg-white/10 text-white hover:bg-white/20 transition"
                aria-label="Next image"
              >
                <ChevronRight size={24} />
              </button>
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 px-3 py-1 rounded-full bg-black/50 text-white text-xs font-medium">
                {state.index + 1} / {state.images.length}
              </div>
            </>
          )}

          <div className="relative z-[1] max-w-[95vw] max-h-[90vh] flex flex-col items-center" onClick={e => e.stopPropagation()}>
            {state.title && (
              <p className="mb-3 text-sm text-white/90 font-medium text-center max-w-lg truncate">{state.title}</p>
            )}
            <img
              src={current}
              alt={state.title || 'Image preview'}
              className="max-w-full max-h-[82vh] object-contain rounded-lg shadow-2xl select-none"
              draggable={false}
            />
          </div>
        </div>
      )}
    </ImageViewerContext.Provider>
  );
}
