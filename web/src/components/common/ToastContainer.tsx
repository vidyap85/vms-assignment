import { useToastStore } from "../../store/toastStore";

const variantClasses: Record<string, string> = {
  info: "border-surface-700 bg-surface-800 text-surface-100",
  success: "border-ok/40 bg-ok/10 text-ok-soft",
  warning: "border-warn/40 bg-warn/10 text-warn-soft",
  error: "border-danger/40 bg-danger/10 text-danger-soft",
};

export default function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-80 flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto flex items-start justify-between gap-2 rounded-md border px-3 py-2 text-sm shadow-lg backdrop-blur ${variantClasses[t.variant]}`}
        >
          <span className="leading-snug">{t.message}</span>
          <button
            onClick={() => dismiss(t.id)}
            className="text-surface-400 hover:text-surface-100"
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
