import React, { useState } from 'react';
import { Zap, Copy, Check, ExternalLink, Plus, Trash2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SDK } from '@/lib/custom-sdk.js';

const TRIGGERS = [
  { id: 'task_created',    label: 'Task Created',     desc: 'When a new task is added' },
  { id: 'task_completed',  label: 'Task Completed',   desc: 'When a task is marked done' },
  { id: 'event_created',   label: 'Event Created',    desc: 'When a calendar event is added' },
  { id: 'goal_completed',  label: 'Goal Completed',   desc: 'When a goal reaches 100%' },
  { id: 'expense_added',   label: 'Expense Logged',   desc: 'When a new transaction is recorded' },
  { id: 'habit_completed', label: 'Habit Completed',  desc: 'When a daily habit is checked off' },
];

export default function ZapierWebhookPanel() {
  const [showAdd, setShowAdd] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [selectedTrigger, setSelectedTrigger] = useState('task_created');
  const [copiedId, setCopiedId] = useState(null);
  const queryClient = useQueryClient();

  // Store webhooks in UserSettings as JSON string
  const { data: settingsList = [] } = useQuery({
    queryKey: ['userSettings'],
    queryFn: () => SDK.entities.UserSettings.list(),
  });
  const settings = settingsList[0];
  const webhooks = (() => { try { return JSON.parse(settings?.dietary_notes || '[]'); } catch { return []; } })();

  const saveMutation = useMutation({
    mutationFn: (hooks) => {
      const data = { dietary_notes: JSON.stringify(hooks) };
      if (settings?.id) return SDK.entities.UserSettings.update(settings.id, data);
      return SDK.entities.UserSettings.create(data);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['userSettings'] }),
  });

  const addHook = () => {
    if (!webhookUrl.trim()) return;
    const newHook = { id: Date.now().toString(), url: webhookUrl.trim(), trigger: selectedTrigger, active: true, created: new Date().toISOString() };
    saveMutation.mutate([...webhooks, newHook]);
    setWebhookUrl('');
    setShowAdd(false);
    toast.success('Webhook added! Vagus Planner will now notify your endpoint.');
  };

  const removeHook = (id) => saveMutation.mutate(webhooks.filter(h => h.id !== id));
  const toggleHook = (id) => saveMutation.mutate(webhooks.map(h => h.id === id ? { ...h, active: !h.active } : h));

  const copyUrl = (url, id) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    toast.success('Webhook URL copied');
  };

  return (
    <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
      <div className="bg-gradient-to-r from-orange-500 to-amber-500 p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-white" />
          <span className="font-bold text-white">Zapier / Webhook Integration</span>
        </div>
        <a href="https://zapier.com" target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-1 text-xs text-white/80 hover:text-white">
          Zapier <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      <div className="p-5 space-y-4">
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Connect Vagus Planner to 5,000+ apps via Zapier webhooks. When a trigger fires, your endpoint receives a POST with the event data.
        </p>

        {/* Existing webhooks */}
        {webhooks.length > 0 && (
          <div className="space-y-2">
            {webhooks.map(hook => {
              const trigger = TRIGGERS.find(t => t.id === hook.trigger);
              return (
                <div key={hook.id} className={`p-3 rounded-xl border transition-all ${hook.active ? 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50' : 'border-slate-100 dark:border-slate-800 opacity-60'}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-orange-600 dark:text-orange-400">{trigger?.label || hook.trigger}</span>
                    <div className="flex items-center gap-1">
                      <button onClick={() => toggleHook(hook.id)}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${hook.active ? 'bg-orange-500' : 'bg-slate-200 dark:bg-slate-700'}`}>
                        <span className={`inline-block h-3 w-3 transform rounded-full bg-white shadow transition-transform ${hook.active ? 'translate-x-5' : 'translate-x-1'}`} />
                      </button>
                      <button onClick={() => copyUrl(hook.url, hook.id)} className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700">
                        {copiedId === hook.id ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3 text-slate-400" />}
                      </button>
                      <button onClick={() => removeHook(hook.id)} className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-950/30">
                        <Trash2 className="w-3 h-3 text-red-400" />
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-slate-400 truncate">{hook.url}</p>
                </div>
              );
            })}
          </div>
        )}

        {/* Add webhook */}
        {showAdd ? (
          <div className="space-y-3 p-4 bg-orange-50 dark:bg-orange-950/20 rounded-xl border border-orange-100 dark:border-orange-900">
            <div>
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Trigger Event</p>
              <select value={selectedTrigger} onChange={e => setSelectedTrigger(e.target.value)}
                className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-400">
                {TRIGGERS.map(t => <option key={t.id} value={t.id}>{t.label} — {t.desc}</option>)}
              </select>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Webhook URL</p>
              <input value={webhookUrl} onChange={e => setWebhookUrl(e.target.value)}
                placeholder="https://hooks.zapier.com/hooks/catch/..."
                className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-400" />
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={addHook} className="bg-orange-500 hover:bg-orange-600 text-white">Add Webhook</Button>
              <Button size="sm" variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            </div>
          </div>
        ) : (
          <Button variant="outline" size="sm" onClick={() => setShowAdd(true)} className="w-full text-xs border-dashed">
            <Plus className="w-3.5 h-3.5 mr-1.5" /> Add Webhook
          </Button>
        )}

        <p className="text-[11px] text-slate-400 leading-relaxed">
          💡 <strong>How to use with Zapier:</strong> Create a "Webhooks by Zapier" → "Catch Hook" trigger, copy the URL, and paste it above. Then connect it to Gmail, Slack, Notion, Google Sheets, or 5,000+ other apps.
        </p>
      </div>
    </div>
  );
}