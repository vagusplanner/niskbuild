import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DollarSign, CheckCircle, Clock, Send } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

export default function ExpenseSettlements({ holiday }) {
  const [currentUser, setCurrentUser] = useState(null);
  const queryClient = useQueryClient();

  React.useEffect(() => {
    base44.auth.me().then(setCurrentUser);
  }, []);

  const { data: expenses = [] } = useQuery({
    queryKey: ['holiday-expenses', holiday?.id],
    queryFn: () => base44.entities.HolidayExpense.filter({ holiday_id: holiday.id }),
    enabled: !!holiday?.id
  });

  const updateExpenseMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.HolidayExpense.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['holiday-expenses'] });
      toast.success('Payment marked as settled');
    }
  });

  const sendReminderMutation = useMutation({
    mutationFn: (data) => base44.functions.invoke('sendPaymentReminder', data),
    onSuccess: () => {
      toast.success('Payment reminder sent');
    }
  });

  const markAsPaid = (expense, collaboratorEmail) => {
    const updatedSplits = expense.split_with.map(split =>
      split.email === collaboratorEmail ? { ...split, paid: true } : split
    );

    updateExpenseMutation.mutate({
      id: expense.id,
      data: { ...expense, split_with: updatedSplits }
    });
  };

  const sendReminder = (expense, collaboratorEmail) => {
    sendReminderMutation.mutate({
      holiday_title: holiday.title,
      expense_title: expense.title,
      amount: expense.split_with.find(s => s.email === collaboratorEmail)?.amount || 0,
      paid_by: expense.paid_by,
      owed_by: collaboratorEmail
    });
  };

  // Calculate settlements
  const settlements = {};
  
  expenses.forEach(expense => {
    if (expense.split_type !== 'none' && expense.split_with?.length > 0) {
      expense.split_with.forEach(split => {
        const key = `${split.email}-${expense.paid_by}`;
        if (!settlements[key]) {
          settlements[key] = {
            from: split.email,
            to: expense.paid_by,
            total: 0,
            unpaid: 0,
            expenses: []
          };
        }
        settlements[key].total += split.amount;
        if (!split.paid) {
          settlements[key].unpaid += split.amount;
        }
        settlements[key].expenses.push({
          id: expense.id,
          title: expense.title,
          amount: split.amount,
          paid: split.paid
        });
      });
    }
  });

  const mySettlements = Object.values(settlements).filter(s => 
    s.from === currentUser?.email || s.to === currentUser?.email
  );

  if (mySettlements.length === 0) {
    return (
      <Card className="p-4 bg-white border-slate-200">
        <div className="text-center py-4 text-slate-400">
          <DollarSign className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No expense splits yet</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4 bg-white border-slate-200">
      <div className="flex items-center gap-2 mb-4">
        <DollarSign className="w-5 h-5 text-green-600" />
        <h3 className="font-semibold text-slate-800">Payment Settlements</h3>
      </div>

      <div className="space-y-3">
        {mySettlements.map((settlement, idx) => {
          const iOwe = settlement.from === currentUser?.email;
          const otherPerson = iOwe ? settlement.to : settlement.from;
          
          return (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className={`p-3 rounded-lg border-2 ${
                settlement.unpaid > 0 
                  ? iOwe ? 'bg-amber-50 border-amber-200' : 'bg-blue-50 border-blue-200'
                  : 'bg-green-50 border-green-200'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Avatar className="w-8 h-8">
                    <AvatarFallback className="text-xs bg-white">
                      {otherPerson.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium text-slate-800">
                      {iOwe ? 'You owe' : 'Owes you'} {otherPerson}
                    </p>
                    <p className="text-xs text-slate-500">
                      {settlement.expenses.length} expense{settlement.expenses.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-lg font-bold ${
                    settlement.unpaid > 0 
                      ? iOwe ? 'text-amber-700' : 'text-blue-700'
                      : 'text-green-700'
                  }`}>
                    ${settlement.unpaid.toFixed(2)}
                  </p>
                  {settlement.unpaid === 0 && (
                    <Badge className="bg-green-100 text-green-700 text-xs">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Settled
                    </Badge>
                  )}
                </div>
              </div>

              {settlement.unpaid > 0 && (
                <div className="space-y-1 mt-2">
                  {settlement.expenses
                    .filter(e => !e.paid)
                    .map(expense => (
                      <div key={expense.id} className="flex items-center justify-between p-2 bg-white rounded text-xs">
                        <div className="flex items-center gap-2">
                          <Clock className="w-3 h-3 text-amber-500" />
                          <span className="text-slate-700">{expense.title}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">${expense.amount.toFixed(2)}</span>
                          {!iOwe && (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  const fullExpense = expenses.find(e => e.id === expense.id);
                                  markAsPaid(fullExpense, settlement.from);
                                }}
                                className="h-6 px-2"
                              >
                                <CheckCircle className="w-3 h-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  const fullExpense = expenses.find(e => e.id === expense.id);
                                  sendReminder(fullExpense, settlement.from);
                                }}
                                className="h-6 px-2"
                                disabled={sendReminderMutation.isPending}
                              >
                                <Send className="w-3 h-3" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              )}

              {settlement.unpaid > 0 && iOwe && (
                <p className="text-xs text-amber-700 mt-2 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Contact {otherPerson} to arrange payment
                </p>
              )}
            </motion.div>
          );
        })}
      </div>
    </Card>
  );
}