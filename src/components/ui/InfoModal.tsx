'use client';

import type { ReactNode } from 'react';

interface InfoModalProps {
  title: string;
  onClose: () => void;
  closeLabel: string;
  children: ReactNode;
}

// Shared bottom-sheet explanation modal (mode info, first-run intro, streak).
export function InfoModal({ title, onClose, closeLabel, children }: InfoModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 bg-background/90 flex items-end justify-center"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onClose}
    >
      <div
        className="w-full max-w-[440px] bg-surface rounded-t-3xl p-6 pb-8"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-extrabold mb-3">{title}</h2>
        <div className="text-sm font-semibold text-muted leading-relaxed whitespace-pre-line">
          {children}
        </div>
        <button
          onClick={onClose}
          className="mt-6 w-full bg-accent text-background rounded-[18px] p-4 font-extrabold text-base"
        >
          {closeLabel}
        </button>
      </div>
    </div>
  );
}
