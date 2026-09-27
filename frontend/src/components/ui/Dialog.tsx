import React, { Fragment, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../../utils/cn';
import { X } from 'lucide-react';

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  className?: string;
}

const Dialog: React.FC<DialogProps> = ({ open, onOpenChange, children, className }) => {
  if (!open) return null;

  const handleEscape = (e: KeyboardEvent) => {
    if (e.key === 'Escape') onOpenChange(false);
  };

  useEffect(() => {
    document.addEventListener('keydown', handleEscape);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [onOpenChange]);

  const overlay = (
    <div
      className="fixed inset-0 z-50 bg-secondary-900/50 backdrop-blur-sm animate-in fade-in-0"
      onClick={() => onOpenChange(false)}
      aria-hidden="true"
    />
  );

  const content = (
    <div
      className={cn(
        'fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2',
        'rounded-xl bg-card p-6 shadow-xl animate-in zoom-in-95 fade-in-0',
        'sm:max-w-2xl',
        className
      )}
      role="dialog"
      aria-modal="true"
      onClick={(e) => e.stopPropagation()}
    >
      {children}
    </div>
  );

  return createPortal(
    <>
      {overlay}
      {content}
    </>,
    document.body
  );
};

export const DialogContent: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <div className={cn('p-4', className)}>{children}</div>
);

export const DialogHeader: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <div className={cn('flex flex-col space-y-1.5 text-center sm:text-left', className)}>{children}</div>
);

export const DialogTitle: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <h2 className={cn('text-lg font-semibold leading-none tracking-tight', className)}>{children}</h2>
);

export const DialogDescription: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <p className={cn('text-sm text-secondary-500', className)}>{children}</p>
);

export const DialogFooter: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <div className={cn('flex flex-col-reverse sm:flex-row sm:justify-end sm:items-center gap-2 mt-6', className)}>{children}</div>
);

export const DialogClose: React.FC<{ onClick?: () => void; className?: string }> = ({ onClick, className }) => (
  <button type="button" className={cn('absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100', className)} onClick={onClick}>
    <X className="h-4 w-4" />
  </button>
);

export type DialogComponent = React.FC<DialogProps> & {
  Close: typeof DialogClose;
  Content: typeof DialogContent;
  Header: typeof DialogHeader;
  Title: typeof DialogTitle;
  Description: typeof DialogDescription;
  Footer: typeof DialogFooter;
};

const CompoundDialog = Dialog as DialogComponent;
CompoundDialog.Close = DialogClose;
CompoundDialog.Content = DialogContent;
CompoundDialog.Header = DialogHeader;
CompoundDialog.Title = DialogTitle;
CompoundDialog.Description = DialogDescription;
CompoundDialog.Footer = DialogFooter;

export { CompoundDialog as Dialog };
export default CompoundDialog;