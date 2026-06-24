import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import {
  Calculator, DollarSign, Heart, TrendingUp, BookOpen, Sparkles,
  CheckCircle2, Info, Loader2, Calendar, Plus, Trash2, ChevronDown,
  ChevronUp, Shield, AlertTriangle, GraduationCap, PieChart, ArrowLeft
} from 'lucide-react';
import { format, addMonths } from 'date-fns';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

// ─────────────────────────────────────────────
// ZAKAT CALCULATOR
// ─────────────────────────────────────────────
function ZakatTab() {
  const queryClient = useQueryClient();
  const [assets, setAssets] = useState({ gold_value: '', silver_value: '', cash_savings: '', investments: '', property_value: '', debts: '' });
  const [schedule, setSchedule] = useState('lump_sum');
  const [calculating, setCalculating] = useState(false);
  const [result, setResult] = useState(null);

  const { data: history = [] } = useQuery({
    queryKey: ['zakatCalculations'],
    queryFn: () => base44.entities.ZakatCalculation.list('-created_date', 10),
  });
  const { data: donations = [] } = useQuery({
    queryKey: ['charityDonations'],
    queryFn: () => base44.entities.CharityDonation.list('-date', 50),
  });

  const saveMutation = useMutation({
    mutationFn: (data) => base44.entities.ZakatCalculation.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['zakatCalculations'] }); toast.success('Calculation saved!'); },
  });

  const paidThisYear = donations
    .filter(d => d.type === 'zakat' && new Date(d.date).getFullYear() === new Date().getFullYear())
    .reduce((s, d) => s + (d.amount || 0), 0);

  const calculate = async () => {
    setCalculating(true);
    try {
      const nisabInfo = await base44.integrations.Core.InvokeLLM({
        prompt: 'Return the current Nisab threshold in USD based on 85g gold and 595g silver market prices today.',
        add_context_from_internet: true,
        response_json_schema: {
          type: 'object',
          properties: {
            gold_nisab: { type: 'number' },
            silver_nisab: { type: 'number' },
            gold_price_per_gram: { type: 'number' },
            silver_price_per_gram: { type: 'number' },
          }
        }
      });
      const totalWealth =
        parseFloat(assets.gold_value || 0) + parseFloat(assets.silver_value || 0) +
        parseFloat(assets.cash_savings || 0) + parseFloat(assets.investments || 0) +
        parseFloat(assets.property_value || 0) - parseFloat(assets.debts || 0);
      const nisab = nisabInfo.silver_nisab; // use silver (lower, more inclusive)
      const zakatDue = totalWealth >= nisab ? totalWealth * 0.025 : 0;
      setResult({ totalWealth, nisab, zakatDue, nisabInfo, schedule });
    } catch {
      // Static fallback
      const totalWealth = Object.entries(assets).reduce((s, [k, v]) => k === 'debts' ? s - parseFloat(v||0) : s + parseFloat(v||0), 0);
      const nisab = 4250;
      const zakatDue = totalWealth >= nisab ? totalWealth * 0.025 : 0;
      setResult({ totalWealth, nisab, zakatDue, nisabInfo: null, schedule });
    }
    setCalculating(false);
  };

  const saveAndSchedule = async () => {
    if (!result) return;
    await saveMutation.mutateAsync({
      total_zakatable_wealth: result.totalWealth,
      nisab_threshold: result.nisab,
      zakat_due: result.zakatDue,
      payment_schedule: schedule,
      year: new Date().getFullYear(),
      calculation_date: new Date().toISOString().split('T')[0],
      status: 'calculated',
      amount_paid: 0,
      ...assets,
    });
    // Schedule calendar events
    const count = schedule === 'monthly' ? 12 : schedule === 'quarterly' ? 4 : 1;
    const perPayment = result.zakatDue / count;
    for (let i = 0; i < count; i++) {
      const d = addMonths(new Date(), schedule === 'monthly' ? i : schedule === 'quarterly' ? i * 3 : 0);
      await base44.entities.Event.create({
        title: `Zakat Payment ${i + 1}/${count} — $${perPayment.toFixed(2)}`,
        start_date: d.toISOString(), end_date: d.toISOString(),
        category: 'other', is_all_day: true,
        reminders: [{ minutes_before: 1440, type: 'notification' }]
      });
    }
    queryClient.invalidateQueries({ queryKey: ['events'] });
    toast.success('Zakat scheduled in your calendar!');
  };

  const fields = [
    { key: 'gold_value', label: 'Gold Value ($)' },
    { key: 'silver_value', label: 'Silver Value ($)' },
    { key: 'cash_savings', label: 'Cash & Bank Savings ($)' },
    { key: 'investments', label: 'Investments / Stocks ($)' },
    { key: 'property_value', label: 'Investment Property ($)' },
    { key: 'debts', label: 'Outstanding Debts — deducted ($)' },
  ];

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4">
          <p className="text-xs text-emerald-600 dark:text-emerald-400 mb-1">Zakat Paid This Year</p>
          <p className="text-2xl font-black text-emerald-700 dark:text-emerald-300">${paidThisYear.toFixed(2)}</p>
        </div>
        <div className="bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 rounded-xl p-4">
          <p className="text-xs text-teal-600 dark:text-teal-400 mb-1">Last Calculation</p>
          <p className="text-sm font-semibold text-teal-700 dark:text-teal-300">
            {history[0] ? format(new Date(history[0].calculation_date || history[0].created_date), 'MMM d, yyyy') : 'None yet'}
          </p>
        </div>
      </div>

      {/* Asset inputs */}
      <div className="bg-white dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 p-4 space-y-3">
        <h3 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-emerald-600" /> Enter Your Assets
        </h3>
        <div className="grid sm:grid-cols-2 gap-3">
          {fields.map(f => (
            <div key={f.key}>
              <Label className="text-xs text-slate-600 dark:text-slate-400">{f.label}</Label>
              <Input type="number" placeholder="0.00" value={assets[f.key]}
                onChange={e => setAssets(a => ({ ...a, [f.key]: e.target.value }))}
                className={f.key === 'debts' ? 'border-rose-200 focus:ring-rose-400' : ''}
              />
            </div>
          ))}
        </div>
        <div>
          <Label className="text-xs text-slate-600 dark:text-slate-400">Payment Schedule</Label>
          <Select value={schedule} onValueChange={setSchedule}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="lump_sum">Lump Sum (Once)</SelectItem>
              <SelectItem value="monthly">Monthly (÷12)</SelectItem>
              <SelectItem value="quarterly">Quarterly (÷4)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={calculate} disabled={calculating} className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white">
          {calculating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
          {calculating ? 'Calculating with live prices…' : 'Calculate Zakat'}
        </Button>
      </div>

      {/* Result */}
      <AnimatePresence>
        {result && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-950/60 dark:to-teal-950/50 border border-emerald-300 dark:border-emerald-700 rounded-xl p-5 space-y-3">
            <h3 className="font-bold text-emerald-900 dark:text-emerald-100 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" /> Results
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-emerald-800 dark:text-emerald-300">Total Zakatable Wealth</span><span className="font-bold">${result.totalWealth.toFixed(2)}</span></div>
              <div className="flex justify-between"><span className="text-emerald-800 dark:text-emerald-300">Nisab Threshold (Silver)</span><span className="font-bold">${result.nisab.toFixed(2)}</span></div>
            </div>
            {result.zakatDue > 0 ? (
              <>
                <div className="bg-white/70 dark:bg-slate-800/50 rounded-lg p-3 flex justify-between items-center">
                  <span className="font-semibold text-emerald-900 dark:text-emerald-100">Total Zakat Due (2.5%)</span>
                  <span className="text-2xl font-black text-emerald-700 dark:text-emerald-300">${result.zakatDue.toFixed(2)}</span>
                </div>
                {schedule !== 'lump_sum' && (
                  <p className="text-sm text-emerald-700 dark:text-emerald-300">
                    {schedule === 'monthly' ? 'Monthly' : 'Quarterly'}: ${(schedule === 'monthly' ? result.zakatDue / 12 : result.zakatDue / 4).toFixed(2)}
                  </p>
                )}
                <Button onClick={saveAndSchedule} disabled={saveMutation.isPending} className="w-full bg-emerald-700 hover:bg-emerald-800 text-white">
                  <Calendar className="w-4 h-4 mr-2" /> Save & Schedule in Calendar
                </Button>
              </>
            ) : (
              <div className="bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 rounded-lg p-3 flex gap-2">
                <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-blue-700 dark:text-blue-300">Your wealth is below the Nisab threshold — Zakat is not obligatory this year.</p>
              </div>
            )}
            {result.nisabInfo && (
              <p className="text-xs text-emerald-600 dark:text-emerald-500">
                Live prices — Gold: ${result.nisabInfo.gold_price_per_gram?.toFixed(2)}/g · Silver: ${result.nisabInfo.silver_price_per_gram?.toFixed(2)}/g
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* History */}
      {history.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-semibold text-slate-700 dark:text-slate-300 text-sm">Calculation History</h3>
          {history.map(c => (
            <div key={c.id} className="bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl p-3 flex justify-between items-center">
              <div>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Year {c.year || new Date(c.created_date).getFullYear()}</p>
                <p className="text-xs text-slate-500">{c.calculation_date || format(new Date(c.created_date), 'MMM d, yyyy')}</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-emerald-600 dark:text-emerald-400">${(c.zakat_due || c.zakat_amount || 0).toFixed(2)}</p>
                <Badge variant="outline" className="text-xs">{c.status || 'calculated'}</Badge>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// CHARITY TRACKER
// ─────────────────────────────────────────────
function CharityTab() {
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState('');
  const [type, setType] = useState('sadaqah');
  const [name, setName] = useState('');

  const { data: donations = [] } = useQuery({
    queryKey: ['charityDonations'],
    queryFn: () => base44.entities.CharityDonation.list('-date', 50),
    initialData: [],
  });

  const saveMutation = useMutation({
    mutationFn: (d) => base44.entities.CharityDonation.create(d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['charityDonations'] });
      setAmount(''); setName('');
      toast.success("Donation recorded! May Allah accept it 🤲");
    }
  });

  const total = donations.reduce((s, d) => s + (d.amount || 0), 0);
  const zakatPaid = donations.filter(d => d.type === 'zakat').reduce((s, d) => s + (d.amount || 0), 0);
  const sadaqah = donations.filter(d => d.type === 'sadaqah').reduce((s, d) => s + (d.amount || 0), 0);

  const TYPE_COLORS = { zakat: 'bg-emerald-100 text-emerald-700', sadaqah: 'bg-teal-100 text-teal-700', fidya: 'bg-amber-100 text-amber-700', kaffarah: 'bg-purple-100 text-purple-700' };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-3">
        {[{ label: 'Total Given', val: total, c: 'from-green-50 to-emerald-50 dark:from-green-950/40 dark:to-emerald-950/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800' },
          { label: 'Zakat Paid', val: zakatPaid, c: 'from-teal-50 to-cyan-50 dark:from-teal-950/40 dark:to-cyan-950/30 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800' },
          { label: 'Sadaqah', val: sadaqah, c: 'from-purple-50 to-pink-50 dark:from-purple-950/40 dark:to-pink-950/30 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800' }
        ].map(s => (
          <div key={s.label} className={`bg-gradient-to-br ${s.c} border rounded-xl p-3`}>
            <p className="text-xs opacity-70 mb-1">{s.label}</p>
            <p className="text-lg font-black">${s.val.toFixed(0)}</p>
          </div>
        ))}
      </div>

      <div className="bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl p-4 space-y-3">
        <h3 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <Heart className="w-4 h-4 text-rose-500" /> Record Donation
        </h3>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Amount ($)</Label>
            <Input type="number" placeholder="0.00" value={amount} onChange={e => setAmount(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="sadaqah">Sadaqah</SelectItem>
                <SelectItem value="zakat">Zakat</SelectItem>
                <SelectItem value="fidya">Fidya</SelectItem>
                <SelectItem value="kaffarah">Kaffarah</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div>
          <Label className="text-xs">Charity / Cause</Label>
          <Input placeholder="e.g. Local Mosque, Islamic Relief" value={name} onChange={e => setName(e.target.value)} />
        </div>
        <Button className="w-full bg-rose-600 hover:bg-rose-700 text-white" disabled={!amount || !name || saveMutation.isPending}
          onClick={() => saveMutation.mutate({ amount: parseFloat(amount), charity_name: name, type, date: new Date().toISOString(), currency: 'USD' })}>
          <Heart className="w-4 h-4 mr-2" /> {saveMutation.isPending ? 'Saving…' : 'Record Donation'}
        </Button>
      </div>

      {donations.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-400">Recent Donations</h3>
          {donations.slice(0, 8).map(d => (
            <div key={d.id} className="bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl p-3 flex justify-between items-center">
              <div>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{d.charity_name}</p>
                <p className="text-xs text-slate-500">{d.date ? format(new Date(d.date), 'MMM d, yyyy') : '—'}</p>
              </div>
              <div className="text-right flex items-center gap-2">
                <p className="font-bold text-emerald-600 dark:text-emerald-400">${d.amount?.toFixed(2)}</p>
                <Badge className={`text-xs ${TYPE_COLORS[d.type] || 'bg-slate-100 text-slate-600'}`}>{d.type}</Badge>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// HALAL INVESTMENTS
// ─────────────────────────────────────────────
const HALAL_PRACTICES = [
  { title: 'Riba (Interest)', status: 'haram', desc: 'Charging or paying interest is strictly prohibited in Islam. This includes conventional bank loans, credit card interest, and interest-bearing bonds.' },
  { title: 'Sukuk (Islamic Bonds)', status: 'halal', desc: 'Sharia-compliant bonds where investors share in the profits/losses of a real asset rather than receiving interest.' },
  { title: 'Islamic REITs', status: 'halal', desc: 'Real estate investment trusts that comply with Sharia law — no haram tenants or interest-based financing.' },
  { title: 'Alcohol / Tobacco Stocks', status: 'haram', desc: 'Companies primarily dealing in alcohol, tobacco, or other intoxicants are not permissible.' },
  { title: 'Halal ETFs', status: 'halal', desc: 'Exchange-traded funds screened to exclude companies involved in prohibited activities.' },
  { title: 'Gharar (Uncertainty)', status: 'haram', desc: 'Excessive uncertainty or ambiguity in contracts is prohibited. This affects certain derivatives and speculative instruments.' },
  { title: 'Gold / Silver', status: 'halal', desc: 'Investing in physical gold and silver is permissible and a Sunnah store of wealth.' },
  { title: 'Conventional Insurance', status: 'haram', desc: 'Contains elements of interest, gambling, and uncertainty. Takaful (Islamic insurance) is the permissible alternative.' },
  { title: 'Takaful (Islamic Insurance)', status: 'halal', desc: 'Mutual risk-sharing arrangement compliant with Sharia principles.' },
  { title: 'Cryptocurrency', status: 'disputed', desc: 'Scholars are divided. Pure utility tokens may be permissible; highly speculative meme coins are generally discouraged.' },
];

function InvestmentsTab() {
  const [expanded, setExpanded] = useState(null);
  const [aiQuery, setAiQuery] = useState('');
  const [aiResult, setAiResult] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  const askAI = async () => {
    if (!aiQuery.trim()) return;
    setAiLoading(true);
    setAiResult('');
    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `You are an Islamic finance scholar. Answer the following question about whether a financial product or practice is Halal or Haram according to mainstream Islamic jurisprudence. Be concise, cite relevant Quran/Hadith references where helpful, and mention any scholarly disagreements.\n\nQuestion: ${aiQuery}`,
    });
    setAiResult(res);
    setAiLoading(false);
  };

  const statusStyle = { halal: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300', haram: 'bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300', disputed: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300' };
  const statusIcon = { halal: <CheckCircle2 className="w-3.5 h-3.5" />, haram: <AlertTriangle className="w-3.5 h-3.5" />, disputed: <Info className="w-3.5 h-3.5" /> };

  return (
    <div className="space-y-5">
      {/* AI Ask */}
      <div className="bg-gradient-to-br from-indigo-50 to-violet-50 dark:from-indigo-950/40 dark:to-violet-950/30 border border-indigo-200 dark:border-indigo-800 rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <span className="font-bold text-indigo-800 dark:text-indigo-200">Ask About Halal Finance</span>
        </div>
        <div className="flex gap-2">
          <Input value={aiQuery} onChange={e => setAiQuery(e.target.value)} placeholder="e.g. Is index fund investing halal?" className="flex-1"
            onKeyDown={e => e.key === 'Enter' && askAI()} />
          <Button onClick={askAI} disabled={aiLoading || !aiQuery.trim()} className="bg-indigo-600 hover:bg-indigo-700 text-white">
            {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Ask'}
          </Button>
        </div>
        <AnimatePresence>
          {aiResult && (
            <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="bg-white/70 dark:bg-slate-800/60 rounded-lg p-3 text-sm text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
              {aiResult}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Halal/Haram guide */}
      <div className="space-y-2">
        <h3 className="font-bold text-slate-700 dark:text-slate-300 text-sm flex items-center gap-2">
          <Shield className="w-4 h-4 text-emerald-600" /> Halal / Haram Investment Guide
        </h3>
        {HALAL_PRACTICES.map((p, i) => (
          <div key={p.title} className="bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
            <button className="w-full flex items-center justify-between p-3 text-left" onClick={() => setExpanded(expanded === i ? null : i)}>
              <div className="flex items-center gap-2">
                <span className={`flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full ${statusStyle[p.status]}`}>
                  {statusIcon[p.status]} {p.status.toUpperCase()}
                </span>
                <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">{p.title}</span>
              </div>
              {expanded === i ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </button>
            <AnimatePresence>
              {expanded === i && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                  <p className="px-4 pb-3 text-sm text-slate-600 dark:text-slate-400 border-t border-slate-100 dark:border-slate-700 pt-2">{p.desc}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// EDUCATION
// ─────────────────────────────────────────────
const LESSONS = [
  { title: 'The Prohibition of Riba', icon: '📜', level: 'Foundational', duration: '5 min', content: `Riba (interest/usury) is explicitly prohibited in the Quran (2:275-276, 3:130, 4:161, 30:39) and is one of the major sins in Islam. The Prophet ﷺ cursed the one who consumes riba, pays it, witnesses it, and records it (Muslim).\n\nTypes of Riba:\n• Riba al-Nasi'ah — interest on loans (conventional banking)\n• Riba al-Fadl — unequal exchange of same commodities\n\nPractical impact: Avoid conventional mortgages (use Islamic home finance), credit card debt, and conventional bonds.` },
  { title: 'Zakat — the Pillar of Wealth Purification', icon: '🕌', level: 'Foundational', duration: '7 min', content: `Zakat is the third pillar of Islam — an obligatory annual payment of 2.5% on zakatable wealth held above the Nisab threshold for a lunar year (Hawl).\n\nZakatable assets include: gold, silver, cash, business inventory, livestock, agricultural produce.\n\nNon-zakatable: primary residence, personal vehicle, clothing, tools of trade.\n\nDistribution (8 categories per Quran 9:60): the poor, the needy, zakat collectors, new Muslims, freeing captives, debtors, fi sabilillah, and stranded travellers.` },
  { title: 'Islamic Banking & Finance', icon: '🏦', level: 'Intermediate', duration: '10 min', content: `Islamic finance operates on the principle of profit-and-loss sharing rather than interest. Key contracts include:\n\n• Murabaha — cost-plus financing (used in Islamic mortgages)\n• Musharakah — joint venture / partnership\n• Mudarabah — profit-sharing (investor + entrepreneur)\n• Ijarah — leasing agreement\n• Sukuk — Islamic bonds (asset-backed)\n• Takaful — cooperative insurance\n\nThe Islamic finance industry is worth over $3 trillion globally (2024) and is growing at ~15% annually.` },
  { title: 'Halal Investing Principles', icon: '📈', level: 'Intermediate', duration: '8 min', content: `To screen investments for Sharia compliance:\n\n1. Business Activity Screen — exclude alcohol, tobacco, weapons, adult entertainment, pork, conventional banking/insurance\n2. Financial Ratio Screen — debt-to-market cap < 33%, interest income < 5% of total revenue, accounts receivable < 49% of assets\n3. Purification — if a small % of income is haram, donate that proportion to charity\n\nHalal investment options: Islamic equity funds, Sukuk, real estate (halal), gold/silver, halal ETFs (e.g. HLAL, SPUS, ISDU).` },
  { title: 'Sadaqah & Voluntary Charity', icon: '❤️', level: 'Foundational', duration: '5 min', content: `Unlike Zakat (obligatory), Sadaqah is voluntary charity — one of the most rewarded acts in Islam.\n\nTypes:\n• Sadaqah Jariyah — ongoing charity (well, school, mosque) — rewards continue after death\n• Sadaqah al-Fitr — charity given at end of Ramadan\n• Lillah — donation for Allah's sake\n\n"The example of those who spend their wealth in the way of Allah is like a seed of grain that sprouts seven ears, in every ear a hundred grains." (Quran 2:261)` },
  { title: 'Qard Hasan — Benevolent Loans', icon: '🤝', level: 'Advanced', duration: '6 min', content: `Qard Hasan (beautiful loan) is an interest-free loan given for the sake of Allah. The lender expects repayment of the principal only, with no extra charge.\n\nThis concept is the basis for Islamic microfinance and community lending circles (ROSCAs). Many Islamic countries have Qard Hasan funds for students and the needy.\n\n"Who is it that would loan Allah a goodly loan so He may multiply it for him many times over?" (Quran 2:245)` },
];

function EducationTab() {
  const [openLesson, setOpenLesson] = useState(null);
  const LEVEL_COLOR = { Foundational: 'bg-emerald-100 text-emerald-700', Intermediate: 'bg-blue-100 text-blue-700', Advanced: 'bg-purple-100 text-purple-700' };

  return (
    <div className="space-y-3">
      <div className="bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-950/40 dark:to-yellow-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-1">
          <GraduationCap className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          <span className="font-bold text-amber-800 dark:text-amber-200">Islamic Finance Education</span>
        </div>
        <p className="text-xs text-amber-700 dark:text-amber-400">Learn the principles behind halal wealth management</p>
      </div>

      {LESSONS.map((l, i) => (
        <div key={l.title} className="bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
          <button className="w-full flex items-center gap-3 p-4 text-left" onClick={() => setOpenLesson(openLesson === i ? null : i)}>
            <span className="text-2xl">{l.icon}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">{l.title}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <Badge className={`text-[10px] px-1.5 py-0.5 ${LEVEL_COLOR[l.level]}`}>{l.level}</Badge>
                <span className="text-xs text-slate-400">📖 {l.duration} read</span>
              </div>
            </div>
            {openLesson === i ? <ChevronUp className="w-4 h-4 text-slate-400 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />}
          </button>
          <AnimatePresence>
            {openLesson === i && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                <div className="px-4 pb-4 border-t border-slate-100 dark:border-slate-700 pt-3">
                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">{l.content}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────
export default function IslamicFinancePage() {
  return (
    <div className="max-w-2xl lg:max-w-4xl mx-auto px-3 sm:px-5 py-4 lg:py-8 space-y-5 pb-safe">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700 p-5 shadow-lg">
        <Link to={createPageUrl('Islam')} className="flex items-center gap-1.5 text-white/70 hover:text-white text-sm mb-3 w-fit">
          <ArrowLeft className="w-4 h-4" /> Back to Islam Hub
        </Link>
        <div className="flex items-center gap-3">
          <div className="p-3 bg-white/20 rounded-2xl">
            <DollarSign className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white">Islamic Finance</h1>
            <p className="text-sm text-white/75">Zakat · Halal Investing · Sadaqah · Education</p>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <div className="h-px flex-1 bg-white/20" />
          <span className="text-white/50 text-xs" dir="rtl">الاقتصاد الإسلامي</span>
          <div className="h-px flex-1 bg-white/20" />
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="zakat">
        <TabsList className="grid w-full grid-cols-4 bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl p-1">
          <TabsTrigger value="zakat" className="text-xs sm:text-sm rounded-lg"><Calculator className="w-3.5 h-3.5 mr-1 sm:mr-1.5" />Zakat</TabsTrigger>
          <TabsTrigger value="charity" className="text-xs sm:text-sm rounded-lg"><Heart className="w-3.5 h-3.5 mr-1 sm:mr-1.5" />Charity</TabsTrigger>
          <TabsTrigger value="invest" className="text-xs sm:text-sm rounded-lg"><TrendingUp className="w-3.5 h-3.5 mr-1 sm:mr-1.5" />Halal</TabsTrigger>
          <TabsTrigger value="learn" className="text-xs sm:text-sm rounded-lg"><BookOpen className="w-3.5 h-3.5 mr-1 sm:mr-1.5" />Learn</TabsTrigger>
        </TabsList>

        <TabsContent value="zakat" className="mt-5"><ZakatTab /></TabsContent>
        <TabsContent value="charity" className="mt-5"><CharityTab /></TabsContent>
        <TabsContent value="invest" className="mt-5"><InvestmentsTab /></TabsContent>
        <TabsContent value="learn" className="mt-5"><EducationTab /></TabsContent>
      </Tabs>
    </div>
  );
}