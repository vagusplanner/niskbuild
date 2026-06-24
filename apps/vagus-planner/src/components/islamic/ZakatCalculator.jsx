import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Calculator, 
  Sparkles, 
  Calendar,
  TrendingUp,
  DollarSign,
  CheckCircle2,
  Loader2,
  Info
} from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { format, addMonths } from 'date-fns';

export default function ZakatCalculator() {
  const [assets, setAssets] = useState({
    gold_value: 0,
    silver_value: 0,
    cash_savings: 0,
    investments: 0,
    property_value: 0,
    debts: 0
  });
  const [paymentSchedule, setPaymentSchedule] = useState('lump_sum');
  const [calculating, setCalculating] = useState(false);
  const [result, setResult] = useState(null);

  const queryClient = useQueryClient();

  const { data: calculations = [] } = useQuery({
    queryKey: ['zakatCalculations'],
    queryFn: () => base44.entities.ZakatCalculation.list('-created_date', 10)
  });

  const { data: payments = [] } = useQuery({
    queryKey: ['zakatPayments'],
    queryFn: () => base44.entities.CharitableGiving.filter({ type: 'zakat' }, '-date')
  });

  const saveCalculationMutation = useMutation({
    mutationFn: (data) => base44.entities.ZakatCalculation.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['zakatCalculations'] });
      toast.success('Zakat calculation saved!');
    }
  });

  const schedulePaymentsMutation = useMutation({
    mutationFn: async ({ calculation, schedule }) => {
      // Create calendar events for Zakat payments
      const startDate = new Date();
      const amount = calculation.zakat_due;
      const monthlyAmount = schedule === 'monthly' ? amount / 12 : schedule === 'quarterly' ? amount / 4 : amount;
      const intervals = schedule === 'monthly' ? 12 : schedule === 'quarterly' ? 4 : 1;

      for (let i = 0; i < intervals; i++) {
        const paymentDate = addMonths(startDate, schedule === 'monthly' ? i : i * 3);
        
        await base44.entities.Event.create({
          title: `Zakat Payment ${i + 1}/${intervals}`,
          description: `Scheduled Zakat payment of $${monthlyAmount.toFixed(2)}`,
          start_date: paymentDate.toISOString(),
          end_date: paymentDate.toISOString(),
          category: 'other',
          is_all_day: true,
          reminders: [
            { minutes_before: 1440, type: 'notification' },
            { minutes_before: 60, type: 'notification' }
          ]
        });
      }

      return calculation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      toast.success('Zakat payments scheduled in your calendar!');
    }
  });

  const calculateZakat = async () => {
    setCalculating(true);
    try {
      // Get current Nisab threshold using AI
      const nisabResponse = await base44.integrations.Core.InvokeLLM({
        prompt: `Get the current Nisab threshold for Zakat calculation in USD. 
        
The Nisab is based on the value of:
- 85 grams of gold, OR
- 595 grams of silver

Provide the current market prices and calculate both Nisab values.

Return JSON:
{
  "gold_nisab": current value of 85g gold in USD,
  "silver_nisab": current value of 595g silver in USD,
  "recommended_nisab": which one to use (typically silver as it's lower),
  "gold_price_per_gram": price,
  "silver_price_per_gram": price,
  "date": "today's date"
}`,
        response_json_schema: {
          type: "object",
          properties: {
            gold_nisab: { type: "number" },
            silver_nisab: { type: "number" },
            recommended_nisab: { type: "number" },
            gold_price_per_gram: { type: "number" },
            silver_price_per_gram: { type: "number" },
            date: { type: "string" }
          }
        },
        add_context_from_internet: true
      });

      const totalWealth = 
        parseFloat(assets.gold_value || 0) +
        parseFloat(assets.silver_value || 0) +
        parseFloat(assets.cash_savings || 0) +
        parseFloat(assets.investments || 0) +
        parseFloat(assets.property_value || 0) -
        parseFloat(assets.debts || 0);

      const nisabThreshold = nisabResponse.recommended_nisab;
      const zakatDue = totalWealth >= nisabThreshold ? totalWealth * 0.025 : 0;
      const monthlyPayment = paymentSchedule === 'monthly' ? zakatDue / 12 : 
                             paymentSchedule === 'quarterly' ? zakatDue / 4 : 
                             zakatDue;

      const calculationResult = {
        gold_value: parseFloat(assets.gold_value || 0),
        silver_value: parseFloat(assets.silver_value || 0),
        cash_savings: parseFloat(assets.cash_savings || 0),
        investments: parseFloat(assets.investments || 0),
        property_value: parseFloat(assets.property_value || 0),
        debts: parseFloat(assets.debts || 0),
        total_zakatable_wealth: totalWealth,
        nisab_threshold: nisabThreshold,
        zakat_due: zakatDue,
        payment_schedule: paymentSchedule,
        monthly_payment: monthlyPayment,
        year: new Date().getFullYear(),
        calculation_date: new Date().toISOString().split('T')[0],
        status: 'calculated',
        amount_paid: 0
      };

      setResult({
        ...calculationResult,
        nisabInfo: nisabResponse
      });

    } catch (error) {
      toast.error('Failed to calculate Zakat');
    } finally {
      setCalculating(false);
    }
  };

  const isSavingOrScheduling = saveCalculationMutation.isPending || schedulePaymentsMutation.isPending;

  const handleSaveAndSchedule = async () => {
    if (!result) return;
    const { nisabInfo, ...saveData } = result;
    await saveCalculationMutation.mutateAsync(saveData);
    await schedulePaymentsMutation.mutateAsync({ calculation: result, schedule: paymentSchedule });
    // Also log as an Expense entry for the finance tracker
    const intervals = paymentSchedule === 'monthly' ? 12 : paymentSchedule === 'quarterly' ? 4 : 1;
    const amountPerPayment = result.zakat_due / intervals;
    await base44.entities.Expense.create({
      date: new Date().toISOString().split('T')[0],
      amount: result.zakat_due,
      type: 'zakat',
      category: 'charity',
      description: `Zakat ${result.year} — ${paymentSchedule.replace('_', ' ')} schedule`,
      is_zakat_deductible: true,
    }).catch(() => {});
    queryClient.invalidateQueries({ queryKey: ['expenses'] });
  };

  const totalThisYear = payments
    .filter(p => new Date(p.date).getFullYear() === new Date().getFullYear())
    .reduce((sum, p) => sum + p.amount, 0);

  return (
    <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-emerald-900">
          <Calculator className="w-5 h-5" />
          Zakat Calculator
        </CardTitle>
        <CardDescription>
          Calculate your annual Zakat and schedule payments
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        <Tabs defaultValue="calculate">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="calculate">Calculate</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          <TabsContent value="calculate" className="space-y-6">
            {/* Summary Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-white rounded-lg border border-emerald-200">
                <p className="text-sm text-slate-600 mb-1">Paid This Year</p>
                <p className="text-2xl font-bold text-emerald-700">
                  ${totalThisYear.toFixed(2)}
                </p>
              </div>
              <div className="p-4 bg-white rounded-lg border border-teal-200">
                <p className="text-sm text-slate-600 mb-1">Last Calculation</p>
                <p className="text-sm font-semibold text-teal-700">
                  {calculations[0] ? format(new Date(calculations[0].calculation_date), 'MMM d, yyyy') : 'None yet'}
                </p>
              </div>
            </div>

            {/* Asset Input Form */}
            <div className="space-y-4 p-4 bg-white rounded-lg border border-emerald-200">
              <h3 className="font-semibold text-emerald-900 flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                Enter Your Assets
              </h3>

              <div className="grid gap-3">
                <div>
                  <Label>Gold Value (USD)</Label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={assets.gold_value}
                    onChange={(e) => setAssets({...assets, gold_value: e.target.value})}
                  />
                </div>

                <div>
                  <Label>Silver Value (USD)</Label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={assets.silver_value}
                    onChange={(e) => setAssets({...assets, silver_value: e.target.value})}
                  />
                </div>

                <div>
                  <Label>Cash & Bank Savings (USD)</Label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={assets.cash_savings}
                    onChange={(e) => setAssets({...assets, cash_savings: e.target.value})}
                  />
                </div>

                <div>
                  <Label>Investments (Stocks, Business, etc.)</Label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={assets.investments}
                    onChange={(e) => setAssets({...assets, investments: e.target.value})}
                  />
                </div>

                <div>
                  <Label>Investment Property Value</Label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={assets.property_value}
                    onChange={(e) => setAssets({...assets, property_value: e.target.value})}
                  />
                </div>

                <div>
                  <Label>Outstanding Debts (to deduct)</Label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={assets.debts}
                    onChange={(e) => setAssets({...assets, debts: e.target.value})}
                  />
                </div>
              </div>
            </div>

            {/* Payment Schedule */}
            <div className="space-y-2 p-4 bg-white rounded-lg border border-emerald-200">
              <Label>Payment Schedule</Label>
              <Select value={paymentSchedule} onValueChange={setPaymentSchedule}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select payment schedule" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="lump_sum">Pay Full Amount (Lump Sum)</SelectItem>
                  <SelectItem value="monthly">Split into 12 Monthly Payments</SelectItem>
                  <SelectItem value="quarterly">Split into 4 Quarterly Payments</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={calculateZakat}
              disabled={calculating}
              className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700"
            >
              {calculating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Calculating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Calculate Zakat
                </>
              )}
            </Button>

            {/* Results */}
            {result && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4 p-4 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-lg border border-emerald-300"
              >
                <h3 className="font-bold text-emerald-900 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5" />
                  Zakat Calculation Results
                </h3>

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-emerald-800">Total Zakatable Wealth:</span>
                    <span className="font-semibold text-emerald-900">
                      ${result.total_zakatable_wealth.toFixed(2)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-sm text-emerald-800">Nisab Threshold:</span>
                    <span className="font-semibold text-emerald-900">
                      ${result.nisab_threshold.toFixed(2)}
                    </span>
                  </div>

                  {result.total_zakatable_wealth >= result.nisab_threshold ? (
                    <>
                      <div className="pt-3 border-t border-emerald-300">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-base font-semibold text-emerald-900">
                            Total Zakat Due (2.5%):
                          </span>
                          <span className="text-2xl font-bold text-emerald-700">
                            ${result.zakat_due.toFixed(2)}
                          </span>
                        </div>

                        {paymentSchedule !== 'lump_sum' && (
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-emerald-800">
                              {paymentSchedule === 'monthly' ? 'Monthly' : 'Quarterly'} Payment:
                            </span>
                            <span className="font-semibold text-emerald-900">
                              ${result.monthly_payment.toFixed(2)}
                            </span>
                          </div>
                        )}
                      </div>

                      <Button
                        onClick={handleSaveAndSchedule}
                        disabled={isSavingOrScheduling}
                        className="w-full bg-emerald-700 hover:bg-emerald-800"
                      >
                        {isSavingOrScheduling ? (
                          <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</>
                        ) : (
                          <><Calendar className="w-4 h-4 mr-2" />Save & Schedule in Calendar</>
                        )}
                      </Button>
                    </>
                  ) : (
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-start gap-2">
                        <Info className="w-5 h-5 text-blue-600 mt-0.5" />
                        <div>
                          <p className="text-sm font-semibold text-blue-900">
                            Zakat Not Due
                          </p>
                          <p className="text-xs text-blue-700 mt-1">
                            Your wealth (${result.total_zakatable_wealth.toFixed(2)}) is below the Nisab threshold (${result.nisab_threshold.toFixed(2)}).
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {result.nisabInfo && (
                  <div className="text-xs text-emerald-700 space-y-1">
                    <p>Gold: ${result.nisabInfo.gold_price_per_gram.toFixed(2)}/gram</p>
                    <p>Silver: ${result.nisabInfo.silver_price_per_gram.toFixed(2)}/gram</p>
                    <p className="text-emerald-600">Updated: {result.nisabInfo.date}</p>
                  </div>
                )}
              </motion.div>
            )}
          </TabsContent>

          <TabsContent value="history" className="space-y-3">
            {calculations.length === 0 ? (
              <div className="text-center py-12">
                <Calculator className="w-12 h-12 text-emerald-300 mx-auto mb-3" />
                <p className="text-emerald-600">No calculations yet</p>
              </div>
            ) : (
              calculations.map((calc) => (
                <div key={calc.id} className="p-4 bg-white rounded-lg border border-emerald-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-emerald-900">
                      Year {calc.year}
                    </span>
                    <Badge className={
                      calc.status === 'completed' ? 'bg-green-100 text-green-700' :
                      calc.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                      'bg-slate-100 text-slate-700'
                    }>
                      {calc.status}
                    </Badge>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Zakat Due:</span>
                      <span className="font-semibold">${calc.zakat_due?.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Paid:</span>
                      <span className="font-semibold text-emerald-600">
                        ${calc.amount_paid?.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Schedule:</span>
                      <span className="text-slate-700 capitalize">
                        {calc.payment_schedule?.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}