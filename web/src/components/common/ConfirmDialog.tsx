import Modal from "./Modal";
import Spinner from "./Spinner";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  danger = true,
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      widthClass="max-w-sm"
      footer={
        <>
          <button className="btn-secondary" onClick={onCancel} disabled={loading}>
            Cancel
          </button>
          <button className={danger ? "btn-danger" : "btn-primary"} onClick={onConfirm} disabled={loading}>
            {loading && <Spinner size={14} />}
            {confirmLabel}
          </button>
        </>
      }
    >
      <p className="text-sm text-surface-300">{message}</p>
    </Modal>
  );
}
