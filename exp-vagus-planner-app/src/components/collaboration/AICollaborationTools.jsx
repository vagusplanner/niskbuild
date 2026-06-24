import React, { useState } from 'react';
import { SDK } from '@/lib/custom-sdk.js';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Sparkles, Loader2, FileText, Calendar, DollarSign, 
  CheckCircle2, AlertCircle, Clock, TrendingUp, Users
} from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';

export default function AICollaborationTools({ holiday }) {
  const [summary, setSummary] = useState(null);
  const [meetingTimes, setMeetingTimes] = useState(null);
  const [expenseProposal, setExpenseProposal] = useState(null);
  const [loading, setLoading] = useState({});
  
  const [proposalData, setProposalData] = useState({
    expense_type: 'accommodation',
    description: ''
  });

  const generateSummary = async () => {
    setLoading({ ...loading, summary: true });
    try {
      const { data } = await SDK.functions.invoke('generateCollaborationSummary', {
        holiday_id: holiday.id
      });
      setSummary(data);
      toast.success('Discussion summary generated!');
    } catch (error) {
      toast.error('Failed to generate summary');
    } finally {
      setLoading({ ...loading, summary: false });
    }
  };

  const suggestMeetingTimes = async () => {
    setLoading({ ...loading, meeting: true });
    try {
      const { data } = await SDK.functions.invoke('suggestMeetingTimes', {
        holiday_id: holiday.id,
        duration_minutes: 60
      });
      setMeetingTimes(data);
      toast.success('Meeting times suggested!');
    } catch (error) {
      toast.error('Failed to suggest meeting times');
    } finally {
      setLoading({ ...loading, meeting: false });
    }
  };

  const draftProposal = async () => {
    if (!proposalData.description.trim()) {
      toast.error('Please describe the expense');
      return;
    }
    setLoading({ ...loading, proposal: true });
    try {
      const { data } = await SDK.functions.invoke('draftExpenseProposal', {
        holiday_id: holiday.id,
        ...proposalData
      });
      setExpenseProposal(data);
      toast.success('Expense proposal drafted!');
    } catch (error) {
      toast.error('Failed to draft proposal');
    } finally {
      setLoading({ ...loading, proposal: false });
    }
  };

  return (
    <div className="space-y-4">
      {/* Discussion Summary */}
      <Card className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-purple-600" />
            <h4 className="font-semibold text-slate-800">Discussion Summary</h4>
          </div>
          <Button
            size="sm"
            onClick={generateSummary}
            disabled={loading.summary}
            className="bg-purple-600 hover:bg-purple-700"
          >
            {loading.summary ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          </Button>
        </div>

        <AnimatePresence>
          {summary && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-3"
            >
              {summary.key_decisions?.length > 0 && (
                <div className="p-3 bg-white rounded-lg">
                  <p className="text-xs font-semibold text-purple-700 mb-2 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Key Decisions
                  </p>
                  <ul className="text-xs text-slate-600 space-y-1 list-disc ml-4">
                    {summary.key_decisions.map((decision, i) => (
                      <li key={i}>{decision}</li>
                    ))}
                  </ul>
                </div>
              )}

              {summary.action_items?.length > 0 && (
                <div className="p-3 bg-white rounded-lg">
                  <p className="text-xs font-semibold text-purple-700 mb-2 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    Action Items
                  </p>
                  {summary.action_items.map((item, i) => (
                    <div key={i} className="text-xs text-slate-600 mb-1">
                      <span className="font-medium">{item.task}</span>
                      {item.suggested_owner && <span className="text-slate-400"> • {item.suggested_owner}</span>}
                    </div>
                  ))}
                </div>
              )}

              {summary.open_questions?.length > 0 && (
                <div className="p-3 bg-amber-50 rounded-lg border border-amber-100">
                  <p className="text-xs font-semibold text-amber-700 mb-2">Open Questions</p>
                  <ul className="text-xs text-amber-800 space-y-1 list-disc ml-4">
                    {summary.open_questions.map((q, i) => (
                      <li key={i}>{q}</li>
                    ))}
                  </ul>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </Card>

      {/* Meeting Time Suggestions */}
      <Card className="p-4 bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            <h4 className="font-semibold text-slate-800">Meeting Time Suggestions</h4>
          </div>
          <Button
            size="sm"
            onClick={suggestMeetingTimes}
            disabled={loading.meeting}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {loading.meeting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          </Button>
        </div>

        <AnimatePresence>
          {meetingTimes && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-2"
            >
              {meetingTimes.suggestions?.map((time, i) => (
                <div key={i} className="p-3 bg-white rounded-lg border border-blue-100 hover:border-blue-200 transition-colors">
                  <div className="flex items-start justify-between mb-1">
                    <div>
                      <p className="text-sm font-medium text-slate-800">
                        {format(new Date(time.date), 'EEEE, MMM d')}
                      </p>
                      <p className="text-xs text-slate-600">
                        {time.start_time} - {time.end_time}
                      </p>
                    </div>
                    <Badge className={
                      time.confidence === 'high' ? 'bg-green-100 text-green-700' :
                      time.confidence === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-slate-100 text-slate-700'
                    }>
                      {time.confidence}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{time.reason}</p>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </Card>

      {/* Expense Proposal Draft */}
      <Card className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
        <div className="flex items-center gap-2 mb-3">
          <DollarSign className="w-5 h-5 text-green-600" />
          <h4 className="font-semibold text-slate-800">Draft Expense Proposal</h4>
        </div>

        <div className="space-y-3">
          <Select
            value={proposalData.expense_type}
            onValueChange={(v) => setProposalData({ ...proposalData, expense_type: v })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="accommodation">Accommodation</SelectItem>
              <SelectItem value="flights">Flights</SelectItem>
              <SelectItem value="activities">Activities</SelectItem>
              <SelectItem value="food">Food & Dining</SelectItem>
              <SelectItem value="transport">Transport</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>

          <Textarea
            placeholder="Describe what you want to propose (e.g., 'Book a 5-star beachfront resort with spa')"
            value={proposalData.description}
            onChange={(e) => setProposalData({ ...proposalData, description: e.target.value })}
            className="h-20"
          />

          <Button
            onClick={draftProposal}
            disabled={loading.proposal || !proposalData.description.trim()}
            className="w-full bg-green-600 hover:bg-green-700"
          >
            {loading.proposal ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
            Generate Proposal
          </Button>
        </div>

        <AnimatePresence>
          {expenseProposal && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4 space-y-3"
            >
              <div className="p-4 bg-white rounded-lg border border-green-200">
                <h5 className="font-semibold text-slate-800 mb-2">{expenseProposal.title}</h5>
                
                <div className="flex items-center justify-between mb-3 p-2 bg-green-50 rounded">
                  <div>
                    <p className="text-xs text-slate-600">Total Cost</p>
                    <p className="text-lg font-bold text-green-700">${expenseProposal.estimated_total}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-600">Per Person</p>
                    <p className="text-lg font-bold text-slate-700">${expenseProposal.per_person_cost}</p>
                  </div>
                </div>

                <div className="mb-3">
                  <p className="text-xs font-semibold text-slate-700 mb-1">Rationale</p>
                  <p className="text-xs text-slate-600">{expenseProposal.rationale}</p>
                </div>

                {expenseProposal.benefits?.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs font-semibold text-slate-700 mb-1">Benefits</p>
                    <ul className="text-xs text-slate-600 space-y-1 list-disc ml-4">
                      {expenseProposal.benefits.map((benefit, i) => (
                        <li key={i}>{benefit}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {expenseProposal.alternatives?.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs font-semibold text-slate-700 mb-2">Alternatives</p>
                    {expenseProposal.alternatives.map((alt, i) => (
                      <div key={i} className="mb-2 p-2 bg-slate-50 rounded text-xs">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium">{alt.option}</span>
                          <span className="text-green-600 font-semibold">${alt.cost}</span>
                        </div>
                        <p className="text-slate-600">{alt.pros}</p>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 border-t">
                  <Badge variant="outline" className="text-xs">
                    {expenseProposal.recommended_split}
                  </Badge>
                  <Badge className={
                    expenseProposal.urgency?.toLowerCase().includes('high') ? 'bg-red-100 text-red-700' :
                    expenseProposal.urgency?.toLowerCase().includes('low') ? 'bg-slate-100 text-slate-700' :
                    'bg-yellow-100 text-yellow-700'
                  }>
                    {expenseProposal.urgency}
                  </Badge>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </div>
  );
}