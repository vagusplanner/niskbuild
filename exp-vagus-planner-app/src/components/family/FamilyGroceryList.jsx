import React, { useState } from 'react';
import BarcodeScanner from './BarcodeScanner';
import { SDK } from '@/lib/custom-sdk.js';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { Plus, Trash2, Check, ShoppingCart, Filter, Sparkles, RefreshCw, ScanLine } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const CATEGORIES = [
  { key: 'all', label: 'All', emoji: '🛒' },
  { key: 'produce', label: 'Produce', emoji: '🥦' },
  { key: 'meat_halal', label: 'Halal Meat', emoji: '🥩' },
  { key: 'dairy', label: 'Dairy', emoji: '🥛' },
  { key: 'bakery', label: 'Bakery', emoji: '🍞' },
  { key: 'frozen', label: 'Frozen', emoji: '❄️' },
  { key: 'pantry', label: 'Pantry', emoji: '🫙' },
  { key: 'household', label: 'Household', emoji: '🧴' },
  { key: 'other', label: 'Other', emoji: '📦' },
];

export default function FamilyGroceryList({ groupId, user }) {
  const [name, setName] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  const [quantity, setQuantity] = useState('');
  const [category, setCategory] = useState('other');
  const [isHalal, setIsHalal] = useState(false);
  const [filterCat, setFilterCat] = useState('all');
  const [aiLoading, setAiLoading] = useState(false);
  const qc = useQueryClient();

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['groceryItems', groupId],
    queryFn: () => SDK.entities.GroceryItem.filter({ family_group_id: groupId }),
    enabled: !!groupId,
  });

  const addItem = useMutation({
    mutationFn: (data) => SDK.entities.GroceryItem.create(data),
    onSuccess: () => qc.invalidateQueries(['groceryItems', groupId]),
  });

  const toggleItem = useMutation({
    mutationFn: ({ id, is_checked }) => SDK.entities.GroceryItem.update(id, { is_checked, checked_by: user?.email }),
    onSuccess: () => qc.invalidateQueries(['groceryItems', groupId]),
  });

  const deleteItem = useMutation({
    mutationFn: (id) => SDK.entities.GroceryItem.delete(id),
    onSuccess: () => qc.invalidateQueries(['groceryItems', groupId]),
  });

  const clearChecked = async () => {
    const checked = items.filter(i => i.is_checked);
    await Promise.all(checked.map(i => SDK.entities.GroceryItem.delete(i.id)));
    qc.invalidateQueries(['groceryItems', groupId]);
    toast.success(`Cleared ${checked.length} items`);
  };

  const handleAdd = () => {
    if (!name.trim()) return;
    addItem.mutate({
      family_group_id: groupId,
      name: name.trim(),
      quantity: quantity.trim(),
      category,
      is_halal_verified: isHalal,
      added_by_email: user?.email,
      added_by_name: user?.full_name || user?.email,
      is_checked: false,
    });
    setName(''); setQuantity('');
  };

  const generateAISuggestions = async () => {
    setAiLoading(true);
    try {
      const existing = items.map(i => i.name).join(', ');
      const result = await SDK.integrations.Core.InvokeLLM({
        prompt: `A Muslim family already has these groceries: ${existing || 'nothing'}. Suggest 6 common halal household grocery items they might need. Be practical and varied.`,
        response_json_schema: {
          type: 'object',
          properties: {
            suggestions: {
              type: 'array',
              items: { type: 'object', properties: { name: { type: 'string' }, category: { type: 'string' }, quantity: { type: 'string' } } }
            }
          }
        }
      });
      for (const s of (result.suggestions || [])) {
        await SDK.entities.GroceryItem.create({
          family_group_id: groupId,
          name: s.name,
          quantity: s.quantity || '',
          category: CATEGORIES.find(c => c.label.toLowerCase() === s.category?.toLowerCase())?.key || 'other',
          added_by_email: user?.email,
          added_by_name: 'AI Suggestion',
          is_checked: false,
        });
      }
      qc.invalidateQueries(['groceryItems', groupId]);
      toast.success('AI suggestions added!');
    } catch (_) { toast.error('Failed to generate suggestions'); }
    setAiLoading(false);
  };

  const filtered = filterCat === 'all' ? items : items.filter(i => i.category === filterCat);
  const unchecked = filtered.filter(i => !i.is_checked);
  const checked = filtered.filter(i => i.is_checked);

  return (
    <div className="space-y-4">
      {/* Add item */}
      <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-4 space-y-3">
        <div className="flex gap-2">
          <Input value={name} onChange={e => setName(e.target.value)} placeholder="Item name…"
            className="bg-white/5 border-white/20 text-white placeholder:text-white/30 flex-1"
            onKeyDown={e => e.key === 'Enter' && handleAdd()} />
          <Input value={quantity} onChange={e => setQuantity(e.target.value)} placeholder="Qty"
            className="bg-white/5 border-white/20 text-white placeholder:text-white/30 w-20"
            onKeyDown={e => e.key === 'Enter' && handleAdd()} />
          <Button onClick={handleAdd} disabled={addItem.isPending} className="bg-teal-500 hover:bg-teal-600 text-white font-bold flex-shrink-0">
            <Plus className="w-4 h-4" />
          </Button>
          <Button onClick={() => setShowScanner(true)} variant="outline"
            className="border-amber-400/30 text-amber-400 hover:bg-amber-400/10 bg-transparent flex-shrink-0" title="Scan barcode">
            <ScanLine className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex items-center gap-3">
          <select value={category} onChange={e => setCategory(e.target.value)}
            className="flex-1 bg-white/5 border border-white/15 text-white text-xs rounded-xl px-3 py-2 focus:outline-none">
            {CATEGORIES.filter(c => c.key !== 'all').map(c => (
              <option key={c.key} value={c.key} className="bg-[#071224]">{c.emoji} {c.label}</option>
            ))}
          </select>
          <label className="flex items-center gap-1.5 text-xs text-amber-400 cursor-pointer flex-shrink-0">
            <input type="checkbox" checked={isHalal} onChange={e => setIsHalal(e.target.checked)} className="accent-amber-400" />
            Halal ✓
          </label>
          <Button size="sm" variant="outline" onClick={generateAISuggestions} disabled={aiLoading}
            className="border-purple-500/30 text-purple-400 hover:bg-purple-500/10 bg-transparent text-xs h-8 gap-1 flex-shrink-0">
            {aiLoading ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
            AI Ideas
          </Button>
        </div>
      </div>

      {/* Category filter */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 hide-scrollbar">
        {CATEGORIES.map(c => (
          <button key={c.key} onClick={() => setFilterCat(c.key)}
            className={`flex-shrink-0 text-xs px-3 py-1.5 rounded-full font-bold border transition-all ${
              filterCat === c.key ? 'bg-teal-400 text-[#071224] border-teal-400' : 'border-white/10 text-white/50 hover:text-white'
            }`}>
            {c.emoji} {c.label}
          </button>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 text-center">
        {[['Total', items.length, 'text-white'], ['Remaining', unchecked.length, 'text-teal-400'], ['Done', items.filter(i => i.is_checked).length, 'text-emerald-400']].map(([l, v, cls]) => (
          <div key={l} className="bg-white/[0.03] border border-white/8 rounded-2xl py-2">
            <p className={`text-xl font-black ${cls}`}>{v}</p>
            <p className="text-[10px] text-white/40 font-semibold">{l}</p>
          </div>
        ))}
      </div>

      <AnimatePresence>
        {showScanner && (
          <BarcodeScanner
            onAdd={(scannedItem) => {
              addItem.mutate({
                family_group_id: groupId,
                name: scannedItem.name,
                quantity: scannedItem.quantity || '1',
                category: scannedItem.halal_status === 'haram' ? 'other' : 'meat_halal',
                is_halal_verified: scannedItem.is_halal_verified,
                notes: scannedItem.notes,
                added_by_email: user?.email,
                added_by_name: user?.full_name || user?.email,
                is_checked: false,
              });
            }}
            onClose={() => setShowScanner(false)}
          />
        )}
      </AnimatePresence>

      {isLoading ? (
        <div className="text-center py-8 text-white/30 text-sm">Loading…</div>
      ) : (
        <div className="space-y-4">
          {/* Unchecked items grouped by category */}
          {unchecked.length === 0 && checked.length === 0 && (
            <div className="text-center py-10">
              <ShoppingCart className="w-12 h-12 text-white/20 mx-auto mb-3" />
              <p className="text-white/30 text-sm">Your family grocery list is empty.</p>
              <p className="text-white/20 text-xs mt-1">Add items above or use AI suggestions.</p>
            </div>
          )}

          {unchecked.length > 0 && (
            <div className="space-y-1.5">
              {unchecked.map(item => (
                <motion.div key={item.id} layout initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-3 p-3 bg-white/[0.03] border border-white/8 rounded-2xl hover:border-white/15 transition-all group">
                  <button onClick={() => toggleItem.mutate({ id: item.id, is_checked: true })}
                    className="w-6 h-6 rounded-full border-2 border-white/25 hover:border-teal-400 flex items-center justify-center flex-shrink-0 transition-all">
                  </button>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-bold text-white">{item.name}</span>
                    {item.quantity && <span className="text-xs text-white/40 ml-2">{item.quantity}</span>}
                    {item.is_halal_verified && <span className="ml-2 text-[9px] font-black text-amber-400">✓ HALAL</span>}
                    <p className="text-[10px] text-white/30 mt-0.5">Added by {item.added_by_name || 'Family member'}</p>
                  </div>
                  <span className="text-xs text-white/25">{CATEGORIES.find(c => c.key === item.category)?.emoji}</span>
                  <button onClick={() => deleteItem.mutate(item.id)} className="opacity-0 group-hover:opacity-100 p-1 text-white/20 hover:text-red-400 transition-all">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </motion.div>
              ))}
            </div>
          )}

          {checked.length > 0 && (
            <div className="space-y-1">
              <div className="flex items-center justify-between px-1">
                <p className="text-xs text-white/30 font-bold uppercase tracking-widest">Checked off ({checked.length})</p>
                <button onClick={clearChecked} className="text-xs text-red-400/60 hover:text-red-400 font-bold transition-colors">Clear all</button>
              </div>
              {checked.map(item => (
                <div key={item.id} className="flex items-center gap-3 p-3 bg-white/[0.02] border border-white/5 rounded-2xl opacity-50">
                  <button onClick={() => toggleItem.mutate({ id: item.id, is_checked: false })}
                    className="w-6 h-6 rounded-full bg-teal-500 flex items-center justify-center flex-shrink-0">
                    <Check className="w-3.5 h-3.5 text-white" />
                  </button>
                  <span className="text-sm text-white/50 line-through flex-1">{item.name}</span>
                  <button onClick={() => deleteItem.mutate(item.id)} className="p-1 text-white/15 hover:text-red-400 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}