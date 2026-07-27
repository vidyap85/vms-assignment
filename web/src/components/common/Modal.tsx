import { ReactNode, useEffect } from "react";
import { createPortal } from "react-dom";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  widthClass?: string;
}

export default function Modal({ open, onClose, title, children, footer, widthClass = "max-w-lg" }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        className={`relative z-10 w-full ${widthClass} max-h-[90vh] overflow-y-auto rounded-lg border border-surface-800 bg-surface-900 shadow-2xl`}
      >
        <div className="flex items-center justify-between border-b border-surface-800 px-4 py-3">
          <h2 className="text-sm font-semibold text-surface-100">{title}</h2>
          <button onClick={onClose} className="text-surface-400 hover:text-surface-100" aria-label="Close">
            ✕
          </button>
        </div>
        <div className="px-4 py-4">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-surface-800 px-4 py-3">{footer}</div>}
      </div>
    </div>,
    document.body
  );
}
