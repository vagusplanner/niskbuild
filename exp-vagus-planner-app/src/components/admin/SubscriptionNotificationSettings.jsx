import React, { useState, useEffect } from 'react';
import { SDK } from '@/lib/custom-sdk.js';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Mail, Bell, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function SubscriptionNotificationSettings() {
  const [loading, setLoading] = useState(false);
  const [viewing, setViewing] = useState('settings');
  const queryClient = useQueryClient();

  const { data: settings = [] } = useQuery({
    queryKey: ['subscriptionNotificationSettings'],
    queryFn: () => SDK.asServiceRole.entities.SubscriptionNotificationSettings.list()
  });

  const { data: emailLogs = [] } = useQuery({
    queryKey: ['subscriptionEmailLogs'],
    queryFn: () => SDK.asServiceRole.entities.SubscriptionEmailLog.list('-sent_date', 50)
  });

  const currentSettings = settings[0] || {};

  const updateSettingsMutation = useMutation({
    mutationFn: async (data) => {
      if (settings.length > 0) {
        return SDK.asServiceRole.entities.SubscriptionNotificationSettings.update(
          settings[0].id,
          {
            ...data,
            last_updated: new Date().toISOString()
          }
        );
      } else {
        return SDK.asServiceRole.entities.SubscriptionNotificationSettings.create({
          ...data,
          last_updated: new Date().toISOString()
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptionNotificationSettings'] });
      toast.success('Settings updated');
    },
    onError: () => toast.error('Failed to update settings')
  });

  const handleToggle = (field) => {
    updateSettingsMutation.mutate({
      ...currentSettings,
      [field]: !currentSettings[field]
    });
  };

  const handleInputChange = (field, value) => {
    updateSettingsMutation.mutate({
      ...currentSettings,
      [field]: value
    });
  };

  const notificationTypes = [
    { key: 'notify_new_signups', label: 'New Sign-ups', description: 'Email when users subscribe' },
    { key: 'notify_cancellations', label: 'Cancellations', description: 'Email when subscriptions end' },
    { key: 'notify_payment_failures', label: 'Payment Failures', description: 'Alert on failed payments' },
    { key: 'notify_upgrades', label: 'Plan Upgrades', description: 'Confirm when users upgrade' },
    { key: 'notify_downgrades', label: 'Plan Downgrades', description: 'Confirm when users downgrade' },
    { key: 'notify_renewal_reminders', label: 'Renewal Reminders', description: 'Remind before renewal date' }
  ];

  const getStatusBadge = (status) => {
    const colors = {
      sent: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
      bounced: 'bg-orange-100 text-orange-800',
      opened: 'bg-blue-100 text-blue-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-6">
      <Tabs value={viewing} onValueChange={setViewing} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Bell className="w-4 h-4" />
            Notification Settings
          </TabsTrigger>
          <TabsTrigger value="logs" className="flex items-center gap-2">
            <Mail className="w-4 h-4" />
            Email Logs
          </TabsTrigger>
        </TabsList>

        <TabsContent value="settings" className="space-y-6">
          {/* Notification Type Toggles */}
          <Card>
            <CardHeader>
              <CardTitle>Email Notifications</CardTitle>
              <CardDescription>Configure which subscription events trigger email notifications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {notificationTypes.map(({ key, label, description }) => (
                <div key={key} className="flex items-start justify-between p-4 border border-slate-200 rounded-lg hover:bg-slate-50">
                  <div className="flex-1">
                    <label className="font-medium text-slate-900 block mb-1">{label}</label>
                    <p className="text-sm text-slate-600">{description}</p>
                  </div>
                  <Switch
                    checked={currentSettings[key] !== false}
                    onCheckedChange={() => handleToggle(key)}
                    disabled={updateSettingsMutation.isPending}
                  />
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Advanced Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Advanced Settings</CardTitle>
              <CardDescription>Configure additional notification options</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="renewal_days" className="text-sm font-medium mb-2 block">
                  Renewal Reminder Days Before
                </Label>
                <Input
                  id="renewal_days"
                  type="number"
                  min="1"
                  max="30"
                  value={currentSettings.renewal_reminder_days_before || 7}
                  onChange={(e) => handleInputChange('renewal_reminder_days_before', parseInt(e.target.value))}
                  className="max-w-xs"
                  disabled={updateSettingsMutation.isPending}
                />
                <p className="text-xs text-slate-500 mt-1">Users will receive a reminder this many days before renewal</p>
              </div>

              <div className="border-t pt-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <label className="font-medium text-slate-900 block mb-1">Admin Notifications</label>
                    <p className="text-sm text-slate-600">Receive alerts for major subscription events</p>
                  </div>
                  <Switch
                    checked={currentSettings.notify_admin_on_events !== false}
                    onCheckedChange={() => handleToggle('notify_admin_on_events')}
                    disabled={updateSettingsMutation.isPending}
                  />
                </div>

                {currentSettings.notify_admin_on_events && (
                  <div>
                    <Label htmlFor="admin_email" className="text-sm font-medium mb-2 block">
                      Admin Email Address
                    </Label>
                    <Input
                      id="admin_email"
                      type="email"
                      value={currentSettings.admin_email || ''}
                      onChange={(e) => handleInputChange('admin_email', e.target.value)}
                      placeholder="admin@example.com"
                      className="max-w-sm"
                      disabled={updateSettingsMutation.isPending}
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Email Delivery Log</CardTitle>
              <CardDescription>History of sent subscription notification emails</CardDescription>
            </CardHeader>
            <CardContent>
              {emailLogs.length === 0 ? (
                <div className="py-8 text-center text-slate-500">
                  <Mail className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No emails sent yet</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b">
                      <tr className="text-left">
                        <th className="py-2 px-3 font-medium">Recipient</th>
                        <th className="py-2 px-3 font-medium">Type</th>
                        <th className="py-2 px-3 font-medium">Subject</th>
                        <th className="py-2 px-3 font-medium">Status</th>
                        <th className="py-2 px-3 font-medium">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {emailLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-slate-50">
                          <td className="py-3 px-3 text-slate-600">{log.user_email}</td>
                          <td className="py-3 px-3">
                            <span className="capitalize text-xs bg-slate-100 px-2 py-1 rounded">
                              {log.notification_type.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-slate-700 truncate max-w-xs">{log.subject}</td>
                          <td className="py-3 px-3">
                            <span className={`text-xs font-medium px-2 py-1 rounded capitalize ${getStatusBadge(log.status)}`}>
                              {log.status}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-slate-500">
                            {new Date(log.sent_date).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}