/**
 * CSV Import for Finance — users paste or upload a CSV/bank statement.
 * AI parses the rows and auto-categorizes each transaction.
 */
import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Upload, Sparkles, Loader2, Check, X, FileText, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

const CURRENCY_SYMBOLS = { USD: '$', GBP: '£', EUR: '€', AED: 'د.إ', SAR: '﷼', CAD: 'C$', AUD: 'A$' };

export default function CSVImport({ currency = 'USD' }) {
  const queryClient = useQueryClient();
  const fileRef = useRef();
  const [rawText, setRawText] = useState('');
  const [parsing, setParsing] = useState(false);
  const [parsed, setParsed] = useState(null); // array of transactions
  const [importing, setImporting] = useState(false);
  const sym = CURRENCY_SYMBOLS[currency] || '$';

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setRawText(ev.target.result);
    reader.readAsText(file);
  };

  const handleParse = async () => {
    if (!rawText.trim()) { toast.error('Paste CSV text or upload a file first'); return; }
    setParsing(true);
    setParsed(null);
    try {
      // Limit to first 50 rows to avoid token limits
      const lines = rawText.trim().split('\n').slice(0, 51).join('\n');
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Parse this bank statement/CSV and extract transactions. 
CSV data:
${lines}

For each transaction extract:
- date (YYYY-MM-DD format)
- description (original text, max 60 chars)
- amount (positive number)
- type: "expense" if money out/debit, "income" if money in/credit
- category: one of: food, transport, shopping, bills, health, education, entertainment, fitness, charity, salary, freelance, other

Return JSON array of up to 50 transactions. Skip header rows. Skip rows without amounts.`,
        response_json_schema: {
          type: 'object',
          properties: {
            transactions: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  date: { type: 'string' },
                  description: { type: 'string' },
                  amount: { type: 'number' },
                  type: { type: 'string' },
                  category: { type: 'string' },
                }
              }
            }
          }
        }
      });
      const txs = (result?.transactions || []).filter(t => t.amount > 0 && t.date && t.description);
      if (txs.length === 0) toast.error('No transactions found. Check your CSV format.');
      else setParsed(txs);
    } catch (e) {
      toast.error('Parse failed. Try a simpler CSV format: date, description, amount');
    } finally {
      setParsing(false);
    }
  };

  const handleImport = async () => {
    if (!parsed?.length) return;
    setImporting(true);
    try {
      await base44.entities.Expense.bulkCreate(
        parsed.map(t => ({
          date: t.date,
          description: t.description,
          amount: Math.abs(t.amount),
          type: t.type || 'expense',
          category: t.category || 'other',
        }))
      );
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      toast.success(`✅ Imported ${parsed.length} transactions!`);
      setRawText('');
      setParsed(null);
    } catch (e) {
      toast.error('Import failed. Try importing fewer rows.');
    } finally {
      setImporting(false);
    }
  };

  const removeRow = (i) => setParsed(p => p.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-4 mt-4">
      <Card>
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-900/40">
              <FileText className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Import Bank Statement / CSV</p>
              <p className="text-xs text-slate-500">AI auto-categorizes every transaction. Supports any bank format.</p>
            </div>
          </div>

          {/* Upload or paste */}
          <div className="grid sm:grid-cols-2 gap-3">
            <button
              onClick={() => fileRef.current?.click()}
              className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-emerald-400 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 transition-all group">
              <Upload className="w-6 h-6 text-slate-400 group-hover:text-emerald-500 transition-colors" />
              <span className="text-xs font-medium text-slate-500 group-hover:text-emerald-600">Upload CSV / OFX</span>
              <input ref={fileRef} type="file" accept=".csv,.txt,.ofx" className="hidden" onChange={handleFile} />
            </button>
            <div className="flex flex-col gap-1.5">
              <p className="text-xs text-slate-500 font-medium">Or paste CSV text:</p>
              <textarea
                value={rawText}
                onChange={e => { setRawText(e.target.value); setParsed(null); }}
                placeholder={'Date,Description,Amount\n2024-01-15,Tesco Grocery,-45.20\n2024-01-16,Netflix,-13.99'}
                rows={4}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs font-mono focus:outline-none focus:border-emerald-400 resize-none"
              />
            </div>
          </div>

          {rawText.trim() && !parsed && (
            <Button onClick={handleParse} disabled={parsing} className="w-full bg-emerald-600 hover:bg-emerald-700">
              {parsing ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />AI Categorizing...</> : <><Sparkles className="w-4 h-4 mr-2" />Parse & Categorize with AI</>}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Preview */}
      {parsed && (
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-500" /> {parsed.length} transactions ready to import
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setParsed(null)}>Clear</Button>
                <Button size="sm" onClick={handleImport} disabled={importing} className="bg-emerald-600 hover:bg-emerald-700">
                  {importing ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Upload className="w-4 h-4 mr-1" />}
                  Import All
                </Button>
              </div>
            </div>
            <div className="space-y-1.5 max-h-80 overflow-y-auto">
              {parsed.map((t, i) => (
                <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 group">
                  <div className={`w-1.5 h-8 rounded-full flex-shrink-0 ${t.type === 'income' ? 'bg-emerald-500' : 'bg-red-400'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate">{t.description}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[10px] text-slate-400">{t.date}</span>
                      <Badge className="text-[9px] py-0 px-1 capitalize">{t.category}</Badge>
                    </div>
                  </div>
                  <span className={`text-sm font-bold flex-shrink-0 ${t.type === 'income' ? 'text-emerald-600' : 'text-red-500'}`}>
                    {t.type === 'income' ? '+' : '-'}{sym}{Math.abs(t.amount).toFixed(2)}
                  </span>
                  <button onClick={() => removeRow(i)} className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-500 transition-all">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex items-start gap-2 p-3 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40">
        <AlertCircle className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-blue-700 dark:text-blue-400">
          Tip: Export your bank statement as CSV. Most banks support this under "Download transactions". Works with Barclays, HSBC, Monzo, Revolut, Chase, and more.
        </p>
      </div>
    </div>
  );
}