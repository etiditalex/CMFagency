"use client";

import { useEffect } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

export type GalleryLightboxImage = {
  src: string;
  alt: string;
};

type GalleryLightboxProps = {
  images: GalleryLightboxImage[];
  index: number | null;
  onClose: () => void;
  onChangeIndex: (index: number) => void;
  label?: string;
};

export default function GalleryLightbox({
  images,
  index,
  onClose,
  onChangeIndex,
  label = "Image preview",
}: GalleryLightboxProps) {
  const open = index != null && index >= 0 && index < images.length;
  const current = open ? images[index] : null;

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key === "ArrowLeft") {
        onChangeIndex((index! - 1 + images.length) % images.length);
        return;
      }
      if (e.key === "ArrowRight") {
        onChangeIndex((index! + 1) % images.length);
      }
    };

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, index, images.length, onClose, onChangeIndex]);

  return (
    <AnimatePresence>
      {open && current ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-3 sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-label={label}
          onClick={onClose}
        >
          <div
            className="relative flex h-full w-full max-w-6xl flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between gap-3 text-white">
              <p className="min-w-0 truncate text-sm text-white/80">
                {index! + 1} / {images.length}
                {current.alt ? (
                  <span className="ml-2 hidden text-white/60 sm:inline">· {current.alt}</span>
                ) : null}
              </p>
              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur hover:bg-white/20"
                aria-label="Close image preview"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="relative min-h-0 flex-1">
              <Image
                src={current.src}
                alt={current.alt}
                fill
                unoptimized
                className="object-contain"
                sizes="100vw"
                priority
              />
            </div>

            {images.length > 1 ? (
              <>
                <button
                  type="button"
                  onClick={() => onChangeIndex((index! - 1 + images.length) % images.length)}
                  className="absolute left-1 top-1/2 z-[1] -translate-y-1/2 rounded-full border border-white/20 bg-black/40 p-2.5 text-white backdrop-blur hover:bg-black/60 sm:left-2 sm:p-3"
                  aria-label="Previous image"
                >
                  <ChevronLeft className="h-5 w-5 sm:h-6 sm:w-6" />
                </button>
                <button
                  type="button"
                  onClick={() => onChangeIndex((index! + 1) % images.length)}
                  className="absolute right-1 top-1/2 z-[1] -translate-y-1/2 rounded-full border border-white/20 bg-black/40 p-2.5 text-white backdrop-blur hover:bg-black/60 sm:right-2 sm:p-3"
                  aria-label="Next image"
                >
                  <ChevronRight className="h-5 w-5 sm:h-6 sm:w-6" />
                </button>
              </>
            ) : null}
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
