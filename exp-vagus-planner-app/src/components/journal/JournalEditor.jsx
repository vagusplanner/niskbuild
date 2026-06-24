import React, { useState, useEffect } from 'react';
import { SDK } from '@/lib/custom-sdk.js';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { X, Plus, Save, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import VoiceReflection from './VoiceReflection';
import JournalStarter from './JournalStarter';

const MOODS = [
  { value: 'joyful',     emoji: '😄', label: 'Joyful' },
  { value: 'grateful',   emoji: '🙏', label: 'Grateful' },
  { value: 'peaceful',   emoji: '😌', label: 'Peaceful' },
  { value: 'hopeful',    emoji: '✨', label: 'Hopeful' },
  { value: 'reflective', emoji: '🤔', label: 'Reflective' },
  { value: 'motivated',  emoji: '💪', label: 'Motivated' },
  { value: 'anxious',    emoji: '😰', label: 'Anxious' },
  { value: 'sad',        emoji: '😢', label: 'Sad' },
  { value: 'frustrated', emoji: '😤', label: 'Frustrated' },
  { value: 'tired',      emoji: '😴', label: 'Tired' },
];

const CATEGORIES = [
  { value: 'daily',     label: 'Daily Reflection', color: 'bg-blue-100 text-blue-700' },
  { value: 'gratitude', label: 'Gratitude',         color: 'bg-amber-100 text-amber-700' },
  { value: 'spiritual', label: 'Spiritual',          color: 'bg-purple-100 text-purple-700' },
  { value: 'goals',     label: 'Goals',              color: 'bg-green-100 text-green-700' },
  { value: 'challenges',label: 'Challenges',         color: 'bg-red-100 text-red-700' },
  { value: 'decisions', label: 'Decisions',          color: 'bg-indigo-100 text-indigo-700' },
  { value: 'prayer',    label: 'Prayer',             color: 'bg-teal-100 text-teal-700' },
  { value: 'learning',  label: 'Learning',           color: 'bg-orange-100 text-orange-700' },
];

const DEFAULT_FORM = {
  date: format(new Date(), 'yyyy-MM-dd'),
  title: '',
  content: '',
  mood: '',
  mood_rating: 5,
  tags: [],
  category: 'daily',
  gratitude_items: [],
  wins: [],
  challenges: [],
  lessons_learned: '',
  tomorrow_focus: [],
  is_private: true,
};

export default function JournalEditor({ entry, onSaved, onCancel }) {
  const [form, setForm] = useState(entry ? { ...DEFAULT_FORM, ...entry } : DEFAULT_FORM);
  const [tagInput, setTagInput] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (entry) setForm({ ...DEFAULT_FORM, ...entry });
  }, [entry?.id]);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const addTag = () => {
    const t = tagInput.trim().toLowerCase();
    if (t && !form.tags.includes(t)) set('tags', [...form.tags, t]);
    setTagInput('');
  };

  const removeTag = (t) => set('tags', form.tags.filter(x => x !== t));

  const addListItem = (key, val) => {
    const v = val.trim();
    if (v) set(key, [...(form[key] || []), v]);
  };

  const removeListItem = (key, idx) => set(key, form[key].filter((_, i) => i !== idx));

  const handleSave = async () => {
    if (!form.content && !form.title) {
      toast.error('Please write something before saving.');
      return;
    }
    setSaving(true);
    const payload = { ...form, word_count: form.content?.split(/\s+/).filter(Boolean).length || 0 };
    if (entry?.id) {
      await SDK.entities.Reflection.update(entry.id, payload);
      toast.success('Entry updated!');
    } else {
      await SDK.entities.Reflection.create(payload);
      toast.success('Entry saved!');
    }
    setSaving(false);
    onSaved();
  };

  return (
    <div className="space-y-5">
      {/* Date + Category */}
      <div className="flex flex-wrap gap-3 items-center">
        <Input
          type="date"
          value={form.date}
          onChange={e => set('date', e.target.value)}
          className="w-40 border-sky-200 text-sm"
        />
        <div className="flex flex-wrap gap-1.5">
          {CATEGORIES.map(c => (
            <button
              key={c.value}
              onClick={() => set('category', c.value)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all border ${
                form.category === c.value
                  ? `${c.color} border-current scale-105 shadow-sm`
                  : 'bg-slate-100 text-slate-500 border-transparent hover:border-slate-300'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Title */}
      <Input
        placeholder="Give your entry a title (optional)…"
        value={form.title}
        onChange={e => set('title', e.target.value)}
        className="border-sky-100 focus:border-sky-300 text-base font-semibold"
      />

      {/* Mood Picker */}
      <div>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">How are you feeling?</p>
        <div className="flex flex-wrap gap-2">
          {MOODS.map(m => (
            <button
              key={m.value}
              onClick={() => set('mood', form.mood === m.value ? '' : m.value)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border transition-all ${
                form.mood === m.value
                  ? 'bg-[#1a5a9a] text-white border-[#1a5a9a] shadow-md scale-105'
                  : 'bg-white border-slate-200 text-slate-600 hover:border-sky-300'
              }`}
            >
              <span>{m.emoji}</span> {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Mood Rating */}
      <div>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Mood Rating: <span className="text-[#1a5a9a] text-base">{form.mood_rating}/10</span></p>
        <input
          type="range" min="1" max="10" value={form.mood_rating}
          onChange={e => set('mood_rating', Number(e.target.value))}
          className="w-full accent-[#1a5a9a]"
        />
        <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
          <span>1 – Low</span><span>10 – Excellent</span>
        </div>
      </div>

      {/* Journal Starter — personalised prompts */}
      <JournalStarter
        currentMood={form.mood}
        onUsePrompt={(prompt) => set('content', (form.content ? form.content + '\n\n' : '') + prompt + '\n\n')}
      />

      {/* Voice Reflection */}
      <VoiceReflection
        onTranscript={(text) => set('content', (form.content ? form.content + '\n\n' : '') + text)}
        onAIExtract={(insights) => {
          if (insights.gratitude_items?.length) set('gratitude_items', [...(form.gratitude_items || []), ...insights.gratitude_items]);
          if (insights.tags?.length) set('tags', [...new Set([...(form.tags || []), ...insights.tags])]);
          if (insights.mood_suggestion && !form.mood) set('mood', insights.mood_suggestion);
        }}
      />

      {/* Main Content */}
      <div>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Your Reflection</p>
        <Textarea
          placeholder="Write freely… what's on your mind today?"
          value={form.content}
          onChange={e => set('content', e.target.value)}
          className="min-h-[160px] border-sky-100 focus:border-sky-300 text-sm leading-relaxed resize-none"
        />
        <p className="text-right text-[10px] text-slate-400 mt-1">{form.content?.split(/\s+/).filter(Boolean).length || 0} words</p>
      </div>

      {/* Mini structured sections */}
      <div className="grid sm:grid-cols-2 gap-4">
        <ListInputField label="🙏 Gratitude" items={form.gratitude_items} onAdd={v => addListItem('gratitude_items', v)} onRemove={i => removeListItem('gratitude_items', i)} placeholder="I'm grateful for…" />
        <ListInputField label="🏆 Wins" items={form.wins} onAdd={v => addListItem('wins', v)} onRemove={i => removeListItem('wins', i)} placeholder="A win today…" />
        <ListInputField label="😤 Challenges" items={form.challenges} onAdd={v => addListItem('challenges', v)} onRemove={i => removeListItem('challenges', i)} placeholder="A challenge I faced…" />
        <ListInputField label="🎯 Tomorrow's Focus" items={form.tomorrow_focus} onAdd={v => addListItem('tomorrow_focus', v)} onRemove={i => removeListItem('tomorrow_focus', i)} placeholder="Tomorrow I'll focus on…" />
      </div>

      {/* Lessons */}
      <div>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">📖 Lessons Learned</p>
        <Textarea
          placeholder="What did you learn today?"
          value={form.lessons_learned}
          onChange={e => set('lessons_learned', e.target.value)}
          className="min-h-[72px] border-sky-100 focus:border-sky-300 text-sm resize-none"
        />
      </div>

      {/* Tags */}
      <div>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Tags</p>
        <div className="flex gap-2 flex-wrap mb-2">
          {form.tags.map(t => (
            <Badge key={t} variant="secondary" className="flex items-center gap-1 bg-sky-100 text-sky-700">
              #{t}
              <button onClick={() => removeTag(t)} className="hover:text-red-500"><X className="w-3 h-3" /></button>
            </Badge>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="Add a tag…"
            value={tagInput}
            onChange={e => setTagInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag())}
            className="flex-1 border-sky-100 text-sm h-9"
          />
          <Button variant="outline" size="sm" onClick={addTag} className="h-9 border-sky-200 text-sky-700 hover:bg-sky-50">
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
        <Button variant="ghost" onClick={onCancel} className="text-slate-500">Cancel</Button>
        <Button onClick={handleSave} disabled={saving} className="bg-[#1a5a9a] hover:bg-[#1a3a6e] text-white gap-2">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {entry?.id ? 'Update Entry' : 'Save Entry'}
        </Button>
      </div>
    </div>
  );
}

function ListInputField({ label, items, onAdd, onRemove, placeholder }) {
  const [val, setVal] = useState('');
  const submit = () => { onAdd(val); setVal(''); };
  return (
    <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
      <p className="text-xs font-semibold text-slate-600 mb-2">{label}</p>
      <ul className="space-y-1 mb-2">
        {items?.map((item, i) => (
          <li key={i} className="flex items-center justify-between text-sm text-slate-700 bg-white rounded-lg px-2 py-1 border border-slate-100">
            <span className="flex-1 truncate">{item}</span>
            <button onClick={() => onRemove(i)} className="text-slate-300 hover:text-red-400 ml-1"><X className="w-3 h-3" /></button>
          </li>
        ))}
      </ul>
      <div className="flex gap-1.5">
        <Input
          value={val} onChange={e => setVal(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), submit())}
          placeholder={placeholder}
          className="text-xs h-8 border-slate-200 bg-white flex-1"
        />
        <button onClick={submit} className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-500 hover:text-sky-600 hover:border-sky-300">
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}