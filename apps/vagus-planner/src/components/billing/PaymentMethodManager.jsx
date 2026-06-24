import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CreditCard, Plus, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export default function PaymentMethodManager({ paymentMethodId, onUpdate }) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [cardData, setCardData] = useState({
    cardNumber: '',
    cardName: '',
    expiry: '',
    cvc: ''
  });
  const [loading, setLoading] = useState(false);

  const handleAddPaymentMethod = async () => {
    if (!cardData.cardNumber || !cardData.cardName || !cardData.expiry || !cardData.cvc) {
      toast.error('Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      // In production, this would call a secure Stripe function
      // For now, we'll show a placeholder
      toast.success('Payment method added successfully');
      setShowAddForm(false);
      setCardData({ cardNumber: '', cardName: '', expiry: '', cvc: '' });
    } catch (error) {
      toast.error('Failed to add payment method');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Payment Method
          </CardTitle>
          <CardDescription>Manage your payment methods</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {paymentMethodId ? (
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-slate-900">Credit Card</p>
                  <p className="text-sm text-slate-600">•••• {paymentMethodId.slice(-4)}</p>
                </div>
                <Badge className="bg-green-100 text-green-800">Active</Badge>
              </div>
              <Button
                variant="outline"
                className="w-full mt-4 gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                onClick={() => toast.info('Contact support to remove payment method')}
              >
                <Trash2 className="w-4 h-4" />
                Remove
              </Button>
            </div>
          ) : (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg flex gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-semibold text-amber-900">No payment method on file</p>
                <p className="text-amber-700">Add a payment method to upgrade your subscription</p>
              </div>
            </div>
          )}

          <Button
            onClick={() => setShowAddForm(true)}
            variant="outline"
            className="w-full gap-2"
          >
            <Plus className="w-4 h-4" />
            {paymentMethodId ? 'Add Another Card' : 'Add Payment Method'}
          </Button>
        </CardContent>
      </Card>

      <Dialog open={showAddForm} onOpenChange={setShowAddForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Payment Method</DialogTitle>
            <DialogDescription>
              Add a new credit or debit card to your account
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Cardholder Name</Label>
              <Input
                placeholder="John Doe"
                value={cardData.cardName}
                onChange={(e) => setCardData({ ...cardData, cardName: e.target.value })}
              />
            </div>

            <div>
              <Label>Card Number</Label>
              <Input
                placeholder="4242 4242 4242 4242"
                value={cardData.cardNumber}
                onChange={(e) => setCardData({ ...cardData, cardNumber: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Expiry Date</Label>
                <Input
                  placeholder="MM/YY"
                  value={cardData.expiry}
                  onChange={(e) => setCardData({ ...cardData, expiry: e.target.value })}
                />
              </div>
              <div>
                <Label>CVC</Label>
                <Input
                  placeholder="123"
                  type="password"
                  value={cardData.cvc}
                  onChange={(e) => setCardData({ ...cardData, cvc: e.target.value })}
                />
              </div>
            </div>

            <div className="bg-slate-50 p-3 rounded-lg text-xs text-slate-600">
              <p className="font-semibold mb-1">Test Card Numbers:</p>
              <p>Visa: 4242 4242 4242 4242</p>
              <p>Mastercard: 5555 5555 5555 4444</p>
              <p>Use any future expiry and any 3-digit CVC</p>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowAddForm(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddPaymentMethod}
                disabled={loading}
                className="flex-1"
              >
                {loading ? 'Adding...' : 'Add Card'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}