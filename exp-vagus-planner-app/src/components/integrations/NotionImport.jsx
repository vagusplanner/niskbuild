import React, { useState } from 'react';
import { FileText, Upload, CheckCircle, AlertCircle, Loader2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SDK } from '@/lib/custom-sdk.js';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

const IMPORT_TYPES = [
  { id: 'tasks',  label: 'Tasks',  icon: '✅', desc: 'Import Notion database rows as tasks' },
  { id: 'goals',  label: 'Goals',  icon: '🎯', desc: 'Import Notion pages as life goals' },
  { id: 'notes',  label: 'Journal',icon: '📓', desc: 'Import Notion pages as journal entries' },
];

export default function NotionImport() {
  const [file, setFile] = useState(null);
  const [importType, setImportType] = useState('tasks');
  const [status, setStatus] = useState(null); // null | 'parsing' | 'done' | 'error'
  const [result, setResult] = useState(null);
  const queryClient = useQueryClient();

  const handleFile = (e) => {
    const f = e.target.files?.[0];
    if (f) setFile(f);
  };

  const handleImport = async () => {
    if (!file) return;
    setStatus('parsing');
    try {
      // Upload file
      const { file_url } = await SDK.integrations.Core.UploadFile({ file });

      // Extract data with LLM
      const jsonSchema = importType === 'tasks'
        ? { type: 'object', properties: { items: { type: 'array', items: { type: 'object', properties: { title: { type: 'string' }, description: { type: 'string' }, priority: { type: 'string' }, due_date: { type: 'string' } } } } } }
        : importType === 'goals'
        ? { type: 'object', properties: { items: { type: 'array', items: { type: 'object', properties: { title: { type: 'string' }, description: { type: 'string' }, category: { type: 'string' } } } } } }
        : { type: 'object', properties: { items: { type: 'array', items: { type: 'object', properties: { title: { type: 'string' }, content: { type: 'string' } } } } } };

      const extracted = await SDK.integrations.Core.ExtractDataFromUploadedFile({ file_url, json_schema: jsonSchema });

      if (extracted.status !== 'success' || !extracted.output?.items?.length) {
        throw new Error('Could not parse file — make sure it is a Notion CSV export');
      }

      const items = extracted.output.items.slice(0, 50); // cap at 50

      // Bulk create
      if (importType === 'tasks') {
        await SDK.entities.Task.bulkCreate(items.map(i => ({ title: i.title || 'Imported Task', description: i.description, priority: i.priority || 'medium', status: 'todo' })));
        queryClient.invalidateQueries({ queryKey: ['tasks'] });
      } else if (importType === 'goals') {
        await SDK.entities.Goal.bulkCreate(items.map(i => ({ title: i.title || 'Imported Goal', description: i.description, category: i.category || 'personal', status: 'not_started' })));
        queryClient.invalidateQueries({ queryKey: ['goals'] });
      }

      setResult({ count: items.length, type: importType });
      setStatus('done');
      toast.success(`Imported ${items.length} ${importType} from Notion!`);
    } catch (err) {
      setStatus('error');
      toast.error(err.message || 'Import failed');
    }
  };

  return (
    <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
      <div className="bg-gradient-to-r from-slate-700 to-slate-900 p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-white" />
          <span className="font-bold text-white">Notion / CSV Import</span>
        </div>
        <a href="https://www.notion.so/help/export-your-content" target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-1 text-xs text-white/70 hover:text-white">
          How to export <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      <div className="p-5 space-y-4">
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Import data from Notion, Excel, or any CSV file. Export from Notion as CSV, then upload here.
        </p>

        {/* Import type */}
        <div className="grid grid-cols-3 gap-2">
          {IMPORT_TYPES.map(t => (
            <button key={t.id} onClick={() => setImportType(t.id)}
              className={`p-3 rounded-xl border text-left transition-all ${importType === t.id ? 'border-slate-700 bg-slate-50 dark:bg-slate-800' : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
              <div className="text-xl mb-1">{t.icon}</div>
              <div className="text-xs font-bold text-slate-700 dark:text-slate-200">{t.label}</div>
              <div className="text-[10px] text-slate-400 mt-0.5">{t.desc}</div>
            </button>
          ))}
        </div>

        {/* Upload */}
        <label className={`block cursor-pointer border-2 border-dashed rounded-xl p-6 text-center transition-all ${file ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-950/20' : 'border-slate-200 dark:border-slate-700 hover:border-slate-400'}`}>
          <input type="file" accept=".csv,.xlsx,.json" onChange={handleFile} className="hidden" />
          {file ? (
            <div className="flex items-center justify-center gap-2 text-emerald-700 dark:text-emerald-400">
              <CheckCircle className="w-5 h-5" />
              <span className="text-sm font-semibold">{file.name}</span>
            </div>
          ) : (
            <>
              <Upload className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
              <p className="text-sm text-slate-500">Click to upload CSV, XLSX, or JSON</p>
              <p className="text-xs text-slate-400 mt-1">Max 50 rows imported</p>
            </>
          )}
        </label>

        {/* Import button */}
        <Button onClick={handleImport} disabled={!file || status === 'parsing'} className="w-full bg-slate-800 hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 text-white">
          {status === 'parsing' ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Parsing…</> : <><Upload className="w-4 h-4 mr-2" /> Import {importType}</>}
        </Button>

        {status === 'done' && result && (
          <div className="flex items-center gap-2 p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-xl">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            <p className="text-sm text-emerald-700 dark:text-emerald-300 font-medium">
              ✅ {result.count} {result.type} imported successfully!
            </p>
          </div>
        )}

        {status === 'error' && (
          <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-xl">
            <AlertCircle className="w-4 h-4 text-red-500" />
            <p className="text-sm text-red-600 dark:text-red-400">Import failed. Check your file format.</p>
          </div>
        )}
      </div>
    </div>
  );
}