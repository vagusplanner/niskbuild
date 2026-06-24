import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export function Modal({ isOpen, onClose, children, className, size = "default" }) {
  const sizeClasses = {
    sm: "max-w-md",
    default: "max-w-2xl",
    lg: "max-w-4xl",
    xl: "max-w-6xl",
    full: "max-w-[95vw]"
  };

  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className={cn(
              "bg-white rounded-2xl shadow-2xl w-full max-h-[90vh] overflow-hidden relative",
              sizeClasses[size],
              className
            )}
            onClick={(e) => e.stopPropagation()}
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function ModalHeader({ children, onClose, className }) {
  return (
    <div className={cn("flex items-center justify-between p-6 border-b bg-gradient-to-r from-teal-50 to-cyan-50", className)}>
      <div className="flex-1">{children}</div>
      {onClose && (
        <Button variant="ghost" size="icon" onClick={onClose} className="ml-4">
          <X className="w-5 h-5" />
        </Button>
      )}
    </div>
  );
}

export function ModalContent({ children, className }) {
  return (
    <div className={cn("p-6 overflow-auto max-h-[calc(90vh-120px)]", className)}>
      {children}
    </div>
  );
}

export function ModalFooter({ children, className }) {
  return (
    <div className={cn("flex items-center justify-end gap-2 p-6 border-t bg-slate-50", className)}>
      {children}
    </div>
  );
}