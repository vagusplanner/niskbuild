'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

type DragAxis = 'x' | 'y';

function useDragAxis(axis: DragAxis, onDelta: (delta: number) => void) {
  const dragging = useRef(false);
  const last = useRef(0);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      dragging.current = true;
      last.current = axis === 'x' ? e.clientX : e.clientY;
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      document.body.style.cursor = axis === 'x' ? 'col-resize' : 'row-resize';
      document.body.style.userSelect = 'none';
    },
    [axis]
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging.current) return;
      const current = axis === 'x' ? e.clientX : e.clientY;
      const delta = current - last.current;
      if (delta !== 0) {
        onDelta(delta);
        last.current = current;
      }
    },
    [axis, onDelta]
  );

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    dragging.current = false;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  }, []);

  return { onPointerDown, onPointerMove, onPointerUp };
}

/** Cursor-style ↔ drag between chat panel and preview */
export function ChatPanelDragHandle({ onResize }: { onResize: (deltaX: number) => void }) {
  const [active, setActive] = useState(false);
  const drag = useDragAxis('x', onResize);

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize AI panel"
      title="Drag to resize panel"
      className={`hidden md:flex absolute right-0 top-0 bottom-0 w-2 z-30 cursor-col-resize items-center justify-center group touch-none ${
        active ? 'bg-[var(--copper-primary)]/25' : 'hover:bg-[var(--copper-primary)]/15'
      }`}
      onPointerDown={(e) => {
        setActive(true);
        drag.onPointerDown(e);
      }}
      onPointerMove={drag.onPointerMove}
      onPointerUp={(e) => {
        setActive(false);
        drag.onPointerUp(e);
      }}
      onPointerCancel={(e) => {
        setActive(false);
        drag.onPointerUp(e);
      }}
    >
      <span
        className={`pointer-events-none flex flex-col items-center gap-0 text-[9px] font-bold leading-none text-[var(--copper-melt)] transition-opacity ${
          active ? 'opacity-100' : 'opacity-0 group-hover:opacity-80'
        }`}
        aria-hidden
      >
        <span>‹</span>
        <span>›</span>
      </span>
    </div>
  );
}

/** Cursor-style ↕ drag for prompt height */
export function PromptHeightDragHandle({ onResize }: { onResize: (deltaY: number) => void }) {
  const [active, setActive] = useState(false);
  const drag = useDragAxis('y', (delta) => onResize(-delta));

  return (
    <div
      role="separator"
      aria-orientation="horizontal"
      aria-label="Resize prompt"
      title="Drag to resize prompt"
      className={`relative h-2 -mt-1 mb-1 cursor-row-resize flex items-center justify-center group touch-none ${
        active ? 'bg-[var(--copper-primary)]/20' : 'hover:bg-[var(--copper-primary)]/10'
      }`}
      onPointerDown={(e) => {
        setActive(true);
        drag.onPointerDown(e);
      }}
      onPointerMove={drag.onPointerMove}
      onPointerUp={(e) => {
        setActive(false);
        drag.onPointerUp(e);
      }}
      onPointerCancel={(e) => {
        setActive(false);
        drag.onPointerUp(e);
      }}
    >
      <span
        className={`pointer-events-none flex items-center gap-0.5 text-[9px] font-bold text-[var(--copper-melt)] transition-opacity ${
          active ? 'opacity-100' : 'opacity-0 group-hover:opacity-80'
        }`}
        aria-hidden
      >
        <span>▴</span>
        <span>▾</span>
      </span>
    </div>
  );
}

/** Clamp helper for live resize */
export function useClampedRef(initial: number, min: number, max: number) {
  const valueRef = useRef(initial);
  const [, bump] = useState(0);

  useEffect(() => {
    valueRef.current = initial;
  }, [initial]);

  const applyDelta = useCallback(
    (delta: number, onChange: (v: number) => void) => {
      const next = Math.min(max, Math.max(min, valueRef.current + delta));
      if (next !== valueRef.current) {
        valueRef.current = next;
        onChange(next);
        bump((n) => n + 1);
      }
    },
    [min, max]
  );

  return { valueRef, applyDelta };
}
