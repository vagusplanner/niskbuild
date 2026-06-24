import React from 'react';
import { buttonVariants } from './button';

export function AlertDialog({ children, open, onOpenChange }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => onOpenChange && onOpenChange(false)}>
      <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

export function AlertDialogContent({ children }) { return <>{children}</>; }
export function AlertDialogHeader({ children }) { return <div className="mb-4">{children}</div>; }
export function AlertDialogTitle({ children }) { return <h2 className="text-xl font-bold text-gray-900">{children}</h2>; }
export function AlertDialogDescription({ children }) { return <p className="text-sm text-gray-500">{children}</p>; }
export function AlertDialogFooter({ children }) { return <div className="mt-6 flex justify-end gap-3">{children}</div>; }

export function AlertDialogAction({ children, onClick }) {
  return <button className={`px-4 py-2 rounded-lg ${buttonVariants.default}`} onClick={onClick}>{children}</button>;
}

export function AlertDialogCancel({ children, onClick }) {
  return <button className={`px-4 py-2 rounded-lg ${buttonVariants.outline}`} onClick={onClick}>{children}</button>;
}
