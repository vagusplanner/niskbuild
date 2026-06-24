import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import debounce from 'lodash/debounce';

const USER_COLORS = [
  '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', 
  '#10b981', '#06b6d4', '#f43f5e', '#a855f7'
];

export default function CollaborativeInput({ 
  eventId, 
  field, 
  value, 
  onChange, 
  activeEdits = [],
  user,
  ...inputProps 
}) {
  const [cursorPosition, setCursorPosition] = useState(0);
  const [selection, setSelection] = useState({ start: 0, end: 0 });
  const inputRef = useRef(null);
  const queryClient = useQueryClient();
  const userColor = USER_COLORS[user?.email?.charCodeAt(0) % USER_COLORS.length];

  // Update cursor position mutation
  const updateCursorMutation = useMutation({
    mutationFn: (data) => {
      // Find existing edit record for this user/field
      const existing = activeEdits.find(
        e => e.event_id === eventId && e.editor_email === user?.email && e.field === field
      );
      
      if (existing) {
        return base44.entities.EventEdit.update(existing.id, data);
      } else {
        return base44.entities.EventEdit.create({
          event_id: eventId,
          editor_email: user?.email,
          editor_name: user?.full_name || user?.email,
          field,
          color: userColor,
          ...data
        });
      }
    }
  });

  // Debounced cursor update
  const debouncedCursorUpdate = useRef(
    debounce((position, selStart, selEnd) => {
      if (!eventId || !user) return;
      
      updateCursorMutation.mutate({
        cursor_position: position,
        selection_start: selStart,
        selection_end: selEnd,
        last_active: new Date().toISOString()
      });
    }, 300)
  ).current;

  const handleSelectionChange = () => {
    if (!inputRef.current) return;
    
    const start = inputRef.current.selectionStart || 0;
    const end = inputRef.current.selectionEnd || 0;
    
    setCursorPosition(start);
    setSelection({ start, end });
    debouncedCursorUpdate(start, start, end);
  };

  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;

    input.addEventListener('select', handleSelectionChange);
    input.addEventListener('click', handleSelectionChange);
    input.addEventListener('keyup', handleSelectionChange);

    return () => {
      input.removeEventListener('select', handleSelectionChange);
      input.removeEventListener('click', handleSelectionChange);
      input.removeEventListener('keyup', handleSelectionChange);
    };
  }, []);

  // Other users editing this field
  const otherEditors = activeEdits.filter(
    e => e.field === field && e.editor_email !== user?.email && e.event_id === eventId
  );

  // Filter out stale edits (older than 60 seconds)
  const recentEditors = otherEditors.filter(e => {
    const lastActive = new Date(e.last_active || e.created_date);
    return (new Date() - lastActive) < 60000;
  });

  return (
    <div className="relative">
      {/* Render input/textarea based on props */}
      {inputProps.as === 'textarea' ? (
        <textarea
          ref={inputRef}
          value={value}
          onChange={(e) => {
            onChange(e);
            handleSelectionChange();
          }}
          {...inputProps}
        />
      ) : (
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => {
            onChange(e);
            handleSelectionChange();
          }}
          {...inputProps}
        />
      )}

      {/* Other users' cursors */}
      <AnimatePresence>
        {recentEditors.map((editor) => (
          <motion.div
            key={editor.editor_email}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute -top-8 left-0 z-10"
            style={{
              left: `${Math.min((editor.cursor_position || 0) * 8, 90)}%`
            }}
          >
            <div
              className="px-2 py-1 rounded-md text-xs font-medium text-white shadow-lg flex items-center gap-1"
              style={{ backgroundColor: editor.color }}
            >
              <div 
                className="w-1 h-4 rounded-full"
                style={{ backgroundColor: editor.color }}
              />
              {editor.editor_name?.split('@')[0] || 'User'}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}