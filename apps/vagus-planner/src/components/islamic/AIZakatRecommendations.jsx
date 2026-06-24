import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Loader2, Heart, TrendingUp, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function AIZakatRecommendations() {
  const [recommendations, setRecommendations] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedRec, setSelectedRec] = useState(null);
  const [showDonationDialog, setShowDonationDialog] = useState(false);

  const { data: zakatCalculations = [] } = useQuery({
    queryKey: ['zakatCalculations'],
    queryFn: () => base44.entities.ZakatCalculation.list('-calculation_date', 1)
  });

  const { data: charities = [] } = useQuery({
    queryKey: ['charities'],
    queryFn: () => base44.entities.CharitableGiving.list('-date', 20)
  });

  const { data: goals = [] } = useQuery({
    queryKey: ['goals'],
    queryFn: () => base44.entities.Goal.filter({ status: 'in_progress' })
  });

  const generateRecommendations = async () => {
    setLoading(true);
    try {
      const { data } = await base44.functions.invoke('aiZakatRecommendations', {
        latest_calculation: zakatCalculations[0] || {},
        previous_donations: charities,
        user_goals: goals
      });
      setRecommendations(data.data);
    } catch (error) {
      console.error('Error generating recommendations:', error);
      toast.error('Failed to generate recommendations');
    } finally {
      setLoading(false);
    }
  };

  const handleRecordDonation = async (recommendation) => {
    try {
      await base44.entities.CharitableGiving.create({
        type: 'zakat',
        amount: recommendation.amount_suggested,
        currency: 'USD',
        date: new Date().toISOString().split('T')[0],
        recipient: `Charity - ${recommendation.category}`,
        category: recommendation.category,
        notes: `AI recommended: ${recommendation.title}`
      });
      toast.success('Donation recorded successfully!');
      setShowDonationDialog(false);
      setSelectedRec(null);
    } catch (error) {
      toast.error('Failed to record donation');
    }
  };

  return (
    <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Heart className="w-5 h-5 text-red-500" />
          AI Zakat Recommendations
        </CardTitle>
        <Button 
          onClick={generateRecommendations}
          disabled={loading}
          size="sm"
          className="bg-green-600 hover:bg-green-700"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              Generate
            </>
          )}
        </Button>
      </CardHeader>

      <CardContent>
        {!recommendations ? (
          <div className="text-center py-8">
            <p className="text-sm text-slate-600 mb-4">
              Get personalized Zakat recommendations based on your financial situation
            </p>
            <Button 
              onClick={generateRecommendations}
              disabled={loading}
              className="bg-green-600 hover:bg-green-700"
            >
              {loading ? 'Loading...' : 'Generate Recommendations'}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Zakat Status */}
            <div className="bg-white rounded-lg p-4 border border-green-200">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-slate-500 font-semibold">Obligatory</p>
                  <p className="text-lg font-bold text-green-700">
                    {recommendations.zakat_status.is_obligatory ? 'Yes' : 'No'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-semibold">Amount Due</p>
                  <p className="text-lg font-bold text-slate-800">
                    ${recommendations.zakat_status.amount_due.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-semibold">Remaining</p>
                  <p className="text-lg font-bold text-amber-600">
                    ${recommendations.zakat_status.amount_remaining.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-semibold">Nisab Met</p>
                  <Badge className={recommendations.zakat_status.nisab_met ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'}>
                    {recommendations.zakat_status.nisab_met ? 'Yes' : 'No'}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Recommendations */}
            <div className="space-y-2">
              <h4 className="font-semibold text-sm text-slate-800">Recommended Recipients:</h4>
              <AnimatePresence>
                {recommendations.recommendations.map((rec, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="bg-white rounded-lg p-4 border border-green-100 hover:border-green-300 transition-all cursor-pointer"
                    onClick={() => {
                      setSelectedRec(rec);
                      setShowDonationDialog(true);
                    }}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-semibold text-slate-800">{rec.title}</p>
                        <p className="text-sm text-slate-600 mt-1">{rec.description}</p>
                      </div>
                      <Badge className="bg-green-100 text-green-700 whitespace-nowrap ml-2">
                        ${rec.amount_suggested}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="text-xs">{rec.category}</Badge>
                      <Badge 
                        className={`text-xs ${
                          rec.urgency === 'immediate'
                            ? 'bg-red-100 text-red-700'
                            : rec.urgency === 'this_month'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}
                      >
                        {rec.urgency}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-500 mt-2 italic">{rec.islamic_context}</p>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* Payment Plan */}
            {recommendations.payment_plan && (
              <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg p-4 border border-blue-200">
                <p className="font-semibold text-slate-800 mb-2 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Suggested Payment Plan
                </p>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-slate-600">Frequency</p>
                    <p className="font-semibold text-slate-800 capitalize">
                      {recommendations.payment_plan.suggested_frequency}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-600">Monthly Amount</p>
                    <p className="font-semibold text-slate-800">
                      ${recommendations.payment_plan.monthly_amount}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-slate-600">Next Due</p>
                    <p className="font-semibold text-slate-800">
                      {new Date(recommendations.payment_plan.next_due_date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Islamic Wisdom */}
            <div className="bg-amber-50 rounded-lg p-4 border border-amber-200 italic text-sm text-amber-900">
              💡 {recommendations.wisdom}
            </div>
          </div>
        )}
      </CardContent>

      {/* Donation Dialog */}
      <Dialog open={showDonationDialog} onOpenChange={setShowDonationDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Donation</DialogTitle>
          </DialogHeader>
          {selectedRec && (
            <div className="space-y-4">
              <div className="bg-slate-50 p-4 rounded-lg">
                <p className="font-semibold text-slate-800">{selectedRec.title}</p>
                <p className="text-sm text-slate-600 mt-1">{selectedRec.description}</p>
                <p className="text-2xl font-bold text-green-600 mt-3">
                  ${selectedRec.amount_suggested}
                </p>
              </div>
              <p className="text-sm text-slate-600">
                Recording this donation will help you track your Zakat obligations and create a meaningful financial record.
              </p>
              <div className="flex gap-2">
                <Button
                  onClick={() => handleRecordDonation(selectedRec)}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  Record Donation
                </Button>
                <Button
                  onClick={() => setShowDonationDialog(false)}
                  variant="outline"
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}