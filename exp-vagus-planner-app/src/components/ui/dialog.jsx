export function Dialog({ children, open, onOpenChange }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => onOpenChange && onOpenChange(false)}>
      <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>{children}</div>
    </div>
  );
}
export function DialogContent({ children }) { return <>{children}</>; }
export function DialogHeader({ children }) { return <div className="mb-4">{children}</div>; }
export function DialogTitle({ children }) { return <h2 className="text-xl font-bold text-gray-900">{children}</h2>; }
export function DialogFooter({ children }) { return <div className="mt-6 flex justify-end gap-3">{children}</div>; }
