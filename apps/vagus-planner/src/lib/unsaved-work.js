import { useEffect } from 'react';

const dirtyKeys = new Set();

export function setUnsavedWork(id, isDirty) {
  if (!id) return;
  if (isDirty) dirtyKeys.add(id);
  else dirtyKeys.delete(id);
}

export function hasUnsavedWork() {
  return dirtyKeys.size > 0;
}

/** Returns false if the user cancelled. Safe to call with no dirty editors. */
export function confirmLogoutIfUnsaved() {
  if (!hasUnsavedWork()) return true;
  return window.confirm(
    'You have unsaved work. Log out anyway? Unsaved changes will be lost.'
  );
}

export function useUnsavedWork(id, isDirty) {
  useEffect(() => {
    setUnsavedWork(id, !!isDirty);
    return () => setUnsavedWork(id, false);
  }, [id, isDirty]);
}
