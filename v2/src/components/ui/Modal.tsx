import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  className,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      // Prevent body scrolling
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-base/80 backdrop-blur-sm"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
            aria-describedby={description ? 'modal-desc' : undefined}
            className={cn(
              'relative w-full max-w-lg bg-surface border border-strong rounded-xl p-6 shadow-2xl overflow-hidden z-10',
              className
            )}
          >
            {/* Glow backdrop effects */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-accent/10 blur-[50px] -mr-10 -mt-10 rounded-full pointer-events-none" />

            {/* Close Button */}
            <button
              onClick={onClose}
              aria-label="Close dialog"
              className="absolute top-4 right-4 p-1.5 rounded-lg border border-transparent hover:border-subtle hover:bg-elevated text-muted hover:text-primary transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-accent"
            >
              <X size={16} />
            </button>

            {/* Header */}
            <div className="mb-4">
              <h2 id="modal-title" className="text-xl font-bold text-white tracking-tight">
                {title}
              </h2>
              {description && (
                <p id="modal-desc" className="text-sm text-muted mt-1 leading-relaxed">
                  {description}
                </p>
              )}
            </div>

            {/* Content */}
            <div className="text-sm text-primary mb-6">{children}</div>

            {/* Footer */}
            {footer && (
              <div className="flex justify-end gap-3 border-t border-subtle pt-4">{footer}</div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
