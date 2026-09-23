"use client";

/**
 * Shared fixed-position popover for builder prompt-dock menus.
 * Renders via portal so parent overflow:hidden cannot clip the menu.
 */

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';

type DockPopoverProps = {
  open: boolean;
  onClose: () => void;
  /** Anchor element — usually the trigger button's wrapper */
  anchorRef: React.RefObject<HTMLElement | null>;
  children: ReactNode;
  /** Preferred width of the menu */
  width?: number;
  className?: string;
  /** Extra nodes that should count as "inside" for outside-click (e.g. file input) */
  menuRef?: React.RefObject<HTMLElement | null>;
};

export default function DockPopover({
  open,
  onClose,
  anchorRef,
  children,
  width = 220,
  className = '',
}: DockPopoverProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{
    top: number;
    left: number;
    width: number;
    openUp: boolean;
  } | null>(null);

  const updatePos = () => {
    const el = anchorRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const w = Math.min(width, window.innerWidth - 16);
    const spaceAbove = rect.top - 8;
    const spaceBelow = window.innerHeight - rect.bottom - 8;
    const openUp = spaceAbove >= 120 || spaceAbove > spaceBelow;
    const left = Math.min(Math.max(8, rect.left), window.innerWidth - w - 8);
    setPos({
      top: openUp ? rect.top - 6 : rect.bottom + 6,
      left,
      width: w,
      openUp,
    });
  };

  useLayoutEffect(() => {
    if (!open) {
      setPos(null);
      return;
    }
    updatePos();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (anchorRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      onClose();
    };
    const onReposition = () => updatePos();
    document.addEventListener('mousedown', onDoc);
    window.addEventListener('resize', onReposition);
    window.addEventListener('scroll', onReposition, true);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      window.removeEventListener('resize', onReposition);
      window.removeEventListener('scroll', onReposition, true);
    };
  }, [open, onClose, anchorRef]);

  if (!open || !pos || typeof document === 'undefined') return null;

  return createPortal(
    <div
      ref={menuRef}
      className={`fixed z-[200] rounded-xl border border-[var(--border)] bg-[var(--code-bg)] shadow-[0_8px_32px_rgba(0,0,0,0.45)] overflow-hidden ${className}`}
      style={{
        left: pos.left,
        width: pos.width,
        ...(pos.openUp
          ? { bottom: window.innerHeight - pos.top, top: 'auto' }
          : { top: pos.top }),
      }}
    >
      {children}
    </div>,
    document.body
  );
}
