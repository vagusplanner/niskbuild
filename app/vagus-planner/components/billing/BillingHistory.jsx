import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Download, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const STATUS_COLORS = {
  paid: 'bg-green-100 text-green-800',
  open: 'bg-yellow-100 text-yellow-800',
  draft: 'bg-slate-100 text-slate-800',
  uncollectible: 'bg-red-100 text-red-800',
  void: 'bg-slate-100 text-slate-800'
};

export default function BillingHistory({ invoices, onViewInvoice, onDownloadInvoice }) {
  if (!invoices || invoices.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Billing History</CardTitle>
          <CardDescription>No invoices yet</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-slate-600">Your invoices will appear here when you subscribe to a paid plan.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Billing History</CardTitle>
        <CardDescription>View and download your invoices</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-3 px-4 text-slate-600">Date</th>
                <th className="text-left py-3 px-4 text-slate-600">Plan</th>
                <th className="text-left py-3 px-4 text-slate-600">Amount</th>
                <th className="text-left py-3 px-4 text-slate-600">Status</th>
                <th className="text-left py-3 px-4 text-slate-600">Refund</th>
                <th className="text-right py-3 px-4 text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map(invoice => (
                <tr key={invoice.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="py-3 px-4">
                    {format(new Date(invoice.issued_date), 'MMM d, yyyy')}
                  </td>
                  <td className="py-3 px-4 capitalize">{invoice.plan}</td>
                  <td className="py-3 px-4 font-medium">
                    ${invoice.amount.toFixed(2)}
                  </td>
                  <td className="py-3 px-4">
                    <Badge className={cn('capitalize', STATUS_COLORS[invoice.status])}>
                      {invoice.status}
                    </Badge>
                  </td>
                  <td className="py-3 px-4">
                    {invoice.refund_applied ? (
                      <div className="text-xs">
                        <p className="font-semibold text-green-600">Refunded</p>
                        <p className="text-green-600">${invoice.refund_amount?.toFixed(2)}</p>
                      </div>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right space-x-2 flex justify-end">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onViewInvoice(invoice)}
                      className="gap-1"
                    >
                      <Eye className="w-4 h-4" />
                      View
                    </Button>
                    {invoice.pdf_url && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onDownloadInvoice(invoice)}
                        className="gap-1"
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}