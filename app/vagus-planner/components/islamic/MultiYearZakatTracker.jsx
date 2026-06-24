import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { Calendar, TrendingUp, DollarSign, CheckCircle2, Clock, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function MultiYearZakatTracker() {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const queryClient = useQueryClient();

  const { data: zakatRecords = [] } = useQuery({
    queryKey: ['zakatCalculations'],
    queryFn: () => base44.entities.ZakatCalculation.list('-year')
  });

  const { data: donations = [] } = useQuery({
    queryKey: ['charitableGiving'],
    queryFn: () => base44.entities.CharitableGiving.filter({ type: 'zakat' })
  });

  const currentYearRecord = zakatRecords.find(r => r.year === selectedYear);
  const yearDonations = donations.filter(d => 
    new Date(d.date).getFullYear() === selectedYear && d.type === 'zakat'
  );

  const totalPaid = yearDonations.reduce((sum, d) => sum + d.amount, 0);
  const remaining = currentYearRecord ? currentYearRecord.zakat_due - totalPaid : 0;

  const years = [...new Set(zakatRecords.map(r => r.year))].sort((a, b) => b - a);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-teal-600" />
            Multi-Year Zakat Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Year Selector */}
          <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
            {years.map(year => (
              <Button
                key={year}
                onClick={() => setSelectedYear(year)}
                variant={selectedYear === year ? 'default' : 'outline'}
                className={selectedYear === year ? 'bg-teal-600' : ''}
              >
                {year}
              </Button>
            ))}
          </div>

          {currentYearRecord ? (
            <>
              {/* Current Year Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="w-5 h-5 text-blue-600" />
                    <span className="text-sm text-blue-700 font-medium">Total Due</span>
                  </div>
                  <p className="text-2xl font-bold text-blue-800">
                    ${currentYearRecord.zakat_due.toLocaleString()}
                  </p>
                </div>

                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                    <span className="text-sm text-green-700 font-medium">Paid</span>
                  </div>
                  <p className="text-2xl font-bold text-green-800">
                    ${totalPaid.toLocaleString()}
                  </p>
                </div>

                <div className={`p-4 rounded-lg border ${remaining > 0 ? 'bg-amber-50 border-amber-200' : 'bg-teal-50 border-teal-200'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="w-5 h-5" className={remaining > 0 ? 'text-amber-600' : 'text-teal-600'} />
                    <span className={`text-sm font-medium ${remaining > 0 ? 'text-amber-700' : 'text-teal-700'}`}>
                      Remaining
                    </span>
                  </div>
                  <p className={`text-2xl font-bold ${remaining > 0 ? 'text-amber-800' : 'text-teal-800'}`}>
                    ${Math.max(0, remaining).toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Payment Progress */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-slate-700">Payment Progress</span>
                  <span className="text-sm text-slate-600">
                    {currentYearRecord.zakat_due > 0 ? ((totalPaid / currentYearRecord.zakat_due) * 100).toFixed(1) : 0}%
                  </span>
                </div>
                <div className="h-3 bg-slate-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-teal-500 to-emerald-600 transition-all"
                    style={{ width: `${Math.min(100, (totalPaid / currentYearRecord.zakat_due) * 100)}%` }}
                  />
                </div>
              </div>

              {/* Payment Schedule */}
              {currentYearRecord.payment_schedule && (
                <div className="p-4 bg-slate-50 rounded-lg mb-6">
                  <p className="text-sm font-medium text-slate-700 mb-2">Payment Plan</p>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">
                      {currentYearRecord.payment_schedule === 'lump_sum' ? 'Lump Sum' : 
                       currentYearRecord.payment_schedule === 'monthly' ? 'Monthly Installments' :
                       'Quarterly Installments'}
                    </Badge>
                    {currentYearRecord.monthly_payment && (
                      <span className="text-sm text-slate-600">
                        ${currentYearRecord.monthly_payment.toLocaleString()}/month
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Recent Payments */}
              {yearDonations.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-slate-700 mb-3">Payment History</h4>
                  <div className="space-y-2">
                    {yearDonations.slice(0, 5).map((donation) => (
                      <div key={donation.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-200">
                        <div>
                          <p className="font-medium text-slate-800">${donation.amount.toLocaleString()}</p>
                          {donation.recipient && (
                            <p className="text-sm text-slate-500">{donation.recipient}</p>
                          )}
                        </div>
                        <span className="text-xs text-slate-500">
                          {format(new Date(donation.date), 'MMM d, yyyy')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12">
              <Calendar className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-600 mb-4">No Zakat calculation for {selectedYear}</p>
              <Button className="bg-teal-600 hover:bg-teal-700">
                <Plus className="w-4 h-4 mr-2" />
                Calculate Zakat for {selectedYear}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Historical Trend */}
      {zakatRecords.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              Historical Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {zakatRecords.slice(0, 5).map((record) => {
                const yearDonations = donations.filter(d => 
                  new Date(d.date).getFullYear() === record.year && d.type === 'zakat'
                );
                const paid = yearDonations.reduce((sum, d) => sum + d.amount, 0);
                const completion = record.zakat_due > 0 ? (paid / record.zakat_due) * 100 : 0;

                return (
                  <div key={record.id} className="flex items-center gap-4">
                    <span className="text-sm font-medium text-slate-700 w-16">{record.year}</span>
                    <div className="flex-1">
                      <div className="h-8 bg-slate-100 rounded-lg overflow-hidden relative">
                        <div 
                          className="h-full bg-gradient-to-r from-teal-500 to-emerald-600"
                          style={{ width: `${Math.min(100, completion)}%` }}
                        />
                        <span className="absolute inset-0 flex items-center justify-center text-xs font-medium text-slate-700">
                          ${record.zakat_due.toLocaleString()}
                        </span>
                      </div>
                    </div>
                    <Badge className={completion >= 100 ? 'bg-green-600' : 'bg-amber-600'}>
                      {completion.toFixed(0)}%
                    </Badge>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}