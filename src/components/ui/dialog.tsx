import * as DialogPrimitive from '@radix-ui/react-dialog';
import { dialogOpener, observeDialogOpeners } from './dialog-focus';
import { X } from 'lucide-react';
import { useEffect, useRef, type ReactNode } from 'react';
export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  className = '',
  busy = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  children: ReactNode;
  className?: string;
  busy?: boolean;
}) {
  const opener = useRef<HTMLElement | null>(null);
  useEffect(observeDialogOpeners, []);
  return (
    <DialogPrimitive.Root
      open={open}
      onOpenChange={(value) => {
        if (!busy) onOpenChange(value);
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="dialog-overlay" />
        <DialogPrimitive.Content
          className={`dialog-content ${className}`}
          aria-busy={busy}
          onOpenAutoFocus={() => {
            opener.current = dialogOpener();
          }}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            if (opener.current?.isConnected) opener.current.focus();
            else document.querySelector<HTMLElement>('main')?.focus();
          }}
        >
          <DialogPrimitive.Title className="dialog-title">
            {title}
          </DialogPrimitive.Title>
          <DialogPrimitive.Description className="dialog-description">
            {description}
          </DialogPrimitive.Description>
          {children}
          <DialogPrimitive.Close
            className="dialog-close"
            aria-label="Close dialog"
            disabled={busy}
          >
            <X size={18} />
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
