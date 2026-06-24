import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { X, Plus, Trash2, StickyNote } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

const NOTE_COLORS = [
  'bg-yellow-100 dark:bg-yellow-900 border-yellow-300 dark:border-yellow-700',
  'bg-blue-100 dark:bg-blue-900 border-blue-300 dark:border-blue-700',
  'bg-green-100 dark:bg-green-900 border-green-300 dark:border-green-700',
  'bg-pink-100 dark:bg-pink-900 border-pink-300 dark:border-pink-700',
];

export default function QuickNotes({ selectedDate, onClose }) {
  const storageKey = 'vagus_quick_notes';
  const [notes, setNotes] = useState(() => {
    try { return JSON.parse(localStorage.getItem(storageKey) || '[]'); } catch { return []; }
  });
  const [newText, setNewText] = useState('');
  const [colorIdx, setColorIdx] = useState(0);

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(notes));
  }, [notes]);

  const addNote = () => {
    if (!newText.trim()) return;
    setNotes(prev => [{
      id: Date.now(),
      text: newText.trim(),
      color: colorIdx,
      date: format(selectedDate || new Date(), 'yyyy-MM-dd'),
      created: new Date().toISOString(),
    }, ...prev]);
    setNewText('');
  };

  const deleteNote = (id) => setNotes(prev => prev.filter(n => n.id !== id));

  const dateKey = format(selectedDate || new Date(), 'yyyy-MM-dd');
  const todayNotes = notes.filter(n => n.date === dateKey);
  const otherNotes = notes.filter(n => n.date !== dateKey);

  return (
    <div className="w-80 max-h-[480px] flex flex-col">
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <div className="flex items-center gap-2">
          <StickyNote className="w-4 h-4 text-yellow-500" />
          <h3 className="font-semibold text-slate-800 dark:text-slate-100">Quick Notes</h3>
        </div>
        {onClose && (
          <button onClick={onClose} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Input */}
      <div className="px-4 pb-3">
        <div className={cn("rounded-lg border p-2 mb-2", NOTE_COLORS[colorIdx])}>
          <textarea
            value={newText}
            onChange={e => setNewText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && e.metaKey) addNote(); }}
            placeholder={`Note for ${format(selectedDate || new Date(), 'MMM d')}... (⌘↵ to save)`}
            className="w-full text-sm bg-transparent resize-none outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500 min-h-[60px]"
          />
        </div>
        <div className="flex items-center justify-between">
          {/* Color picker */}
          <div className="flex gap-1">
            {NOTE_COLORS.map((c, i) => (
              <button
                key={i}
                onClick={() => setColorIdx(i)}
                className={cn("w-5 h-5 rounded-full border-2 transition-all", c.split(' ')[0],
                  colorIdx === i ? "border-slate-600 scale-110" : "border-transparent"
                )}
              />
            ))}
          </div>
          <Button size="sm" onClick={addNote} disabled={!newText.trim()} className="h-7 text-xs">
            <Plus className="w-3 h-3 mr-1" /> Add
          </Button>
        </div>
      </div>

      {/* Notes list */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2">
        {todayNotes.length > 0 && (
          <>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
              {format(selectedDate || new Date(), 'MMM d')}
            </p>
            {todayNotes.map(note => (
              <NoteCard key={note.id} note={note} onDelete={deleteNote} />
            ))}
          </>
        )}
        {otherNotes.length > 0 && (
          <>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mt-2">Other</p>
            {otherNotes.slice(0, 10).map(note => (
              <NoteCard key={note.id} note={note} onDelete={deleteNote} />
            ))}
          </>
        )}
        {notes.length === 0 && (
          <p className="text-sm text-slate-400 text-center py-4">No notes yet. Add your first one!</p>
        )}
      </div>
    </div>
  );
}

function NoteCard({ note, onDelete }) {
  return (
    <div className={cn("rounded-lg border p-2.5 group relative", NOTE_COLORS[note.color] || NOTE_COLORS[0])}>
      <p className="text-sm text-slate-700 dark:text-slate-200 whitespace-pre-wrap break-words pr-5">{note.text}</p>
      <div className="flex items-center justify-between mt-1.5">
        <span className="text-[10px] text-slate-400">{note.date}</span>
        <button
          onClick={() => onDelete(note.id)}
          className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-red-100 dark:hover:bg-red-900 transition-all"
        >
          <Trash2 className="w-3 h-3 text-red-500" />
        </button>
      </div>
    </div>
  );
}