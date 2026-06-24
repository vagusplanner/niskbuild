import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PieChart, TrendingUp, Brain, List, Target, Plus, Upload, Scale, FileText } from 'lucide-react';
import FinanceSummary from '@/components/finance/FinanceSummary';
import FinanceHistory from '@/components/finance/FinanceHistory';
import BudgetRolloverPanel from '@/components/finance/BudgetRolloverPanel';
import AIFinanceAdvisor from '@/components/finance/AIFinanceAdvisor';
import SmartExpenseForm from '@/components/finance/SmartExpenseForm';
import CSVImport from '@/components/finance/CSVImport';
import FinanceGoalLink from '@/components/finance/FinanceGoalLink';
import ZakatSadaqaDashboard from '@/components/islamic/ZakatSadaqaDashboard';
import MeetingNotesRecorder from '@/components/finance/MeetingNotesRecorder';

const CURRENCIES = ['USD','GBP','EUR','AED','SAR','CAD','AUD','TRY','PKR'];

export default function FinancePage() {
  const [showForm, setShowForm] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [currency, setCurrency] = useState(() => localStorage.getItem('vagus_currency') || 'USD');
  const setCurrencyPersist = (c) => { setCurrency(c); localStorage.setItem('vagus_currency', c); };

  return (
    <div className="max-w-4xl mx-auto space-y-4 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <span className="text-2xl">💰</span> Finance Tracker
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">AI-powered income, expenses & budget alerts</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={currency} onValueChange={setCurrencyPersist}>
            <SelectTrigger className="w-20 h-9 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CURRENCIES.map(c => <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button onClick={() => setShowForm(true)} className="bg-emerald-600 hover:bg-emerald-700 shadow-sm">
            <Plus className="w-4 h-4 mr-1" /> Add Entry
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-7 w-full">
          <TabsTrigger value="overview" className="text-xs">
            <PieChart className="w-3 h-3 mr-1 hidden sm:block" /> Overview
          </TabsTrigger>
          <TabsTrigger value="history" className="text-xs">
            <List className="w-3 h-3 mr-1 hidden sm:block" /> Txns
          </TabsTrigger>
          <TabsTrigger value="budget" className="text-xs">
            <Target className="w-3 h-3 mr-1 hidden sm:block" /> Budget
          </TabsTrigger>
          <TabsTrigger value="zakat" className="text-xs">
            <Scale className="w-3 h-3 mr-1 hidden sm:block" /> Zakāt
          </TabsTrigger>
          <TabsTrigger value="ai" className="text-xs">
            <Brain className="w-3 h-3 mr-1 hidden sm:block" /> AI
          </TabsTrigger>
          <TabsTrigger value="meetings" className="text-xs">
            <FileText className="w-3 h-3 mr-1 hidden sm:block" /> Meetings
          </TabsTrigger>
          <TabsTrigger value="import" className="text-xs">
            <Upload className="w-3 h-3 mr-1 hidden sm:block" /> Import
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <FinanceSummary onAddEntry={() => setShowForm(true)} currency={currency} />
          <div className="mt-4">
            <FinanceGoalLink />
          </div>
        </TabsContent>

        <TabsContent value="history">
          <FinanceHistory onAddEntry={() => setShowForm(true)} />
        </TabsContent>

        <TabsContent value="budget">
          <BudgetRolloverPanel currency={currency} />
        </TabsContent>

        <TabsContent value="zakat">
          <div className="mt-4">
            <ZakatSadaqaDashboard currency={currency} />
          </div>
        </TabsContent>

        <TabsContent value="ai">
          <AIFinanceAdvisor />
        </TabsContent>

        <TabsContent value="meetings">
          <div className="mt-4 space-y-4">
            <MeetingNotesRecorder />
          </div>
        </TabsContent>

        <TabsContent value="import">
          <CSVImport currency={currency} />
        </TabsContent>
      </Tabs>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Brain className="w-4 h-4 text-emerald-600" /> Smart Add Entry
            </DialogTitle>
          </DialogHeader>
          <SmartExpenseForm onSave={() => setShowForm(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}