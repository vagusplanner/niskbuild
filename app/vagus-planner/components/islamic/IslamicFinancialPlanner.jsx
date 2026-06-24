import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  DollarSign, TrendingUp, Heart, Calendar, 
  Bell, PieChart, AlertCircle, CheckCircle2, Plus
} from 'lucide-react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { toast } from 'sonner';

const ZAKAT_TYPES = [
  { id: 'wealth', name: 'Wealth (2.5%)', rate: 0.025, nisab: 85 * 50 }, // 85g gold approx
  { id: 'business', name: 'Business Assets', rate: 0.025, nisab: 85 * 50 },
  { id: 'agriculture', name: 'Agricultural Produce', rate: 0.10, nisab: 0 },
  { id: 'livestock', name: 'Livestock', rate: 0.025, nisab: 0 }
];

export default function IslamicFinancialPlanner() {
  const [wealth, setWealth] = useState({ cash: '', gold: '', silver: '', investments: '', business: '' });
  const [zakatDue, setZakatDue] = useState(0);
  const [selectedType, setSelectedType] = useState('sadaqah');
  const [zakatReminderSet, setZakatReminderSet] = useState(false);
  const [donationAmount, setDonationAmount] = useState('');
  const [donationName, setDonationName] = useState('');
  const queryClient = useQueryClient();

  const { data: zakatRecords = [] } = useQuery({
    queryKey: ['zakatCalculations'],
    queryFn: () => base44.entities.ZakatCalculation.list('-created_date', 10)
  });

  const { data: donations = [] } = useQuery({
    queryKey: ['charityDonations'],
    queryFn: () => base44.entities.CharityDonation.list('-date', 20)
  });

  const saveDonationMutation = useMutation({
    mutationFn: (data) => base44.entities.CharityDonation.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['charityDonations']);
      setDonationAmount('');
      setDonationName('');
      toast.success('Donation recorded! May Allah accept it 🤲');
    }
  });

  const handleSetZakatReminder = () => {
    base44.entities.Goal.create({
      title: '📅 Annual Zakat Reminder',
      description: 'Calculate and pay Zakat this year',
      category: 'spiritual',
      priority: 'high',
      status: 'in_progress',
      target_date: new Date(new Date().getFullYear(), 11, 31).toISOString().split('T')[0],
    }).then(() => {
      queryClient.invalidateQueries(['goals']);
      setZakatReminderSet(true);
      toast.success('Annual Zakat reminder set and linked to your Goals! 📅');
    });
  };

  const calculateZakat = () => {
    const total = Object.values(wealth).reduce((sum, val) => sum + (parseFloat(val) || 0), 0);
    const nisab = 4250; // Approximate nisab threshold in USD
    
    if (total >= nisab) {
      const zakat = total * 0.025;
      setZakatDue(zakat);
      toast.success(`Zakat calculated: $${zakat.toFixed(2)}`);
      
      // Save calculation
      base44.entities.ZakatCalculation.create({
        total_wealth: total,
        zakat_amount: zakat,
        calculation_date: new Date().toISOString(),
        nisab_threshold: nisab,
        details: wealth
      }).then(() => queryClient.invalidateQueries(['zakatCalculations']));
    } else {
      toast.info('Your wealth is below the nisab threshold');
      setZakatDue(0);
    }
  };

  const totalDonations = donations.reduce((sum, d) => sum + (d.amount || 0), 0);
  const zakatDonations = donations.filter(d => d.type === 'zakat').reduce((sum, d) => sum + (d.amount || 0), 0);

  return (
    <div className="space-y-4">
      <Card className="bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-950 dark:to-yellow-950 border-amber-200 dark:border-amber-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-amber-900 dark:text-amber-100">
            <DollarSign className="w-5 h-5" />
            Islamic Financial Planning
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="zakat" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="zakat">
                <PieChart className="w-4 h-4 mr-1" />
                Zakat
              </TabsTrigger>
              <TabsTrigger value="charity">
                <Heart className="w-4 h-4 mr-1" />
                Charity
              </TabsTrigger>
              <TabsTrigger value="reminders">
                <Bell className="w-4 h-4 mr-1" />
                Reminders
              </TabsTrigger>
            </TabsList>

            {/* Zakat Calculator */}
            <TabsContent value="zakat" className="space-y-4">
              <Card>
                <CardContent className="p-4 space-y-4">
                  <div className="bg-gradient-to-r from-amber-500 to-yellow-600 text-white p-4 rounded-lg">
                    <p className="text-amber-100 text-sm mb-1">Current Nisab Threshold</p>
                    <p className="text-2xl font-bold">$4,250 USD</p>
                    <p className="text-xs text-amber-100 mt-1">Based on 85g of gold</p>
                  </div>

                  <div className="space-y-3">
                    <h4 className="font-semibold text-slate-900 dark:text-slate-100">
                      Calculate Your Zakat
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <Label>Cash & Savings ($)</Label>
                        <Input
                          type="number"
                          placeholder="0.00"
                          value={wealth.cash}
                          onChange={(e) => setWealth({ ...wealth, cash: e.target.value })}
                        />
                      </div>

                      <div>
                        <Label>Gold Value ($)</Label>
                        <Input
                          type="number"
                          placeholder="0.00"
                          value={wealth.gold}
                          onChange={(e) => setWealth({ ...wealth, gold: e.target.value })}
                        />
                      </div>

                      <div>
                        <Label>Silver Value ($)</Label>
                        <Input
                          type="number"
                          placeholder="0.00"
                          value={wealth.silver}
                          onChange={(e) => setWealth({ ...wealth, silver: e.target.value })}
                        />
                      </div>

                      <div>
                        <Label>Investments ($)</Label>
                        <Input
                          type="number"
                          placeholder="0.00"
                          value={wealth.investments}
                          onChange={(e) => setWealth({ ...wealth, investments: e.target.value })}
                        />
                      </div>

                      <div>
                        <Label>Business Assets ($)</Label>
                        <Input
                          type="number"
                          placeholder="0.00"
                          value={wealth.business}
                          onChange={(e) => setWealth({ ...wealth, business: e.target.value })}
                        />
                      </div>
                    </div>

                    <Button onClick={calculateZakat} className="w-full bg-amber-600 hover:bg-amber-700">
                      <PieChart className="w-4 h-4 mr-2" />
                      Calculate Zakat
                    </Button>

                    {zakatDue > 0 && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-4"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <CheckCircle2 className="w-5 h-5 text-green-600" />
                          <h5 className="font-semibold text-green-900 dark:text-green-100">
                            Zakat Due
                          </h5>
                        </div>
                        <p className="text-3xl font-bold text-green-900 dark:text-green-100">
                          ${zakatDue.toFixed(2)}
                        </p>
                        <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                          2.5% of your zakatable wealth
                        </p>
                      </motion.div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Past Calculations */}
              {zakatRecords.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Previous Calculations</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {zakatRecords.slice(0, 3).map((record) => (
                      <div
                        key={record.id}
                        className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 rounded-lg"
                      >
                        <div>
                          <p className="font-medium text-slate-900 dark:text-slate-100">
                            ${record.zakat_amount?.toFixed(2)}
                          </p>
                          <p className="text-xs text-slate-500">
                            {format(new Date(record.created_date), 'MMM d, yyyy')}
                          </p>
                        </div>
                        <Badge variant="outline">
                          Wealth: ${record.total_wealth?.toFixed(0)}
                        </Badge>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Charity Tracker */}
            <TabsContent value="charity" className="space-y-4">
              <Card>
                <CardContent className="p-4 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 p-4 rounded-lg">
                      <p className="text-green-700 dark:text-green-300 text-sm">Total Given</p>
                      <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                        ${totalDonations.toFixed(2)}
                      </p>
                    </div>

                    <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-950 p-4 rounded-lg">
                      <p className="text-purple-700 dark:text-purple-300 text-sm">Zakat Paid</p>
                      <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                        ${zakatDonations.toFixed(2)}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="font-semibold text-slate-900 dark:text-slate-100">Record Donation</h4>
                    <div className="space-y-3">
                      <div>
                        <Label>Amount ($)</Label>
                        <Input type="number" placeholder="0.00" value={donationAmount} onChange={e => setDonationAmount(e.target.value)} />
                      </div>
                      <div>
                        <Label>Type</Label>
                        <Select value={selectedType} onValueChange={setSelectedType}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="sadaqah">Sadaqah (General Charity)</SelectItem>
                            <SelectItem value="zakat">Zakat</SelectItem>
                            <SelectItem value="fidya">Fidya</SelectItem>
                            <SelectItem value="kaffarah">Kaffarah</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Charity/Cause Name</Label>
                        <Input placeholder="e.g., Local Mosque, Relief Fund" value={donationName} onChange={e => setDonationName(e.target.value)} />
                      </div>
                      <Button
                        className="w-full bg-green-600 hover:bg-green-700"
                        disabled={!donationAmount || !donationName || saveDonationMutation.isPending}
                        onClick={() => saveDonationMutation.mutate({ amount: parseFloat(donationAmount), charity_name: donationName, type: selectedType, date: new Date().toISOString(), currency: 'USD' })}
                      >
                        <Heart className="w-4 h-4 mr-2" />
                        Record Donation
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Recent Donations */}
              {donations.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Recent Donations</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {donations.slice(0, 5).map((donation) => (
                      <div
                        key={donation.id}
                        className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 rounded-lg"
                      >
                        <div>
                          <p className="font-medium text-slate-900 dark:text-slate-100">
                            {donation.charity_name}
                          </p>
                          <p className="text-xs text-slate-500">
                            {format(new Date(donation.date), 'MMM d, yyyy')}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-green-600">
                            ${donation.amount?.toFixed(2)}
                          </p>
                          <Badge variant="outline" className="text-xs mt-1">
                            {donation.type}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Reminders */}
            <TabsContent value="reminders" className="space-y-4">
              <Card>
                <CardContent className="p-4 space-y-4">
                  <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <Bell className="w-5 h-5 text-blue-600 mt-0.5" />
                      <div className="flex-1">
                        <h5 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
                          Annual Zakat Reminder
                        </h5>
                        <p className="text-sm text-blue-700 dark:text-blue-300 mb-3">
                          Creates a goal reminder due 31 Dec so you never miss your annual Zakat
                        </p>
                        {zakatReminderSet ? (
                          <div className="flex items-center gap-2 text-emerald-600 text-sm font-medium">
                            <CheckCircle2 className="w-4 h-4" />
                            Reminder set! Check your Goals.
                          </div>
                        ) : (
                          <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white" onClick={handleSetZakatReminder}>
                            <Calendar className="w-4 h-4 mr-2" />
                            Set Reminder
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}