import { useEffect, useId, useRef, type ReactNode } from 'react';

type ModalProps = {
  readonly children: ReactNode;
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly title: string;
};

export const Modal = ({ children, isOpen, onClose, title }: ModalProps) => {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;

    if (dialog === null) {
      return;
    }

    if (isOpen && !dialog.open) {
      dialog.showModal();
    }

    if (!isOpen && dialog.open) {
      dialog.close();
    }
  }, [isOpen]);

  return (
    <dialog
      aria-labelledby={titleId}
      className="modal"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      ref={dialogRef}
    >
      <div className="modal-header">
        <h2 id={titleId}>{title}</h2>
        <button aria-label="Close dialog" className="icon-button" onClick={onClose} type="button">
          Close
        </button>
      </div>
      <div className="modal-content">{children}</div>
    </dialog>
  );
};
