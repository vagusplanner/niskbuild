import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Mail, Bell, CreditCard, TrendingUp } from 'lucide-react';

export default function EmailNotificationSettings() {
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  // Fetch notification preferences
  const { data: preferences = [] } = useQuery({
    queryKey: ['notificationPreferences', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      return await base44.entities.NotificationPreference.filter({
        user_email: user.email,
        notification_type: 'billing'
      });
    },
    enabled: !!user?.email
  });

  const preference = preferences[0] || {
    billing_emails: true,
    renewal_reminders: true,
    payment_alerts: true,
    upgrade_confirmations: true
  };

  // Update preference mutation
  const updateMutation = useMutation({
    mutationFn: async (updates) => {
      if (preferences.length > 0) {
        return await base44.entities.NotificationPreference.update(
          preferences[0].id,
          updates
        );
      } else {
        return await base44.entities.NotificationPreference.create({
          user_email: user.email,
          notification_type: 'billing',
          ...updates
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notificationPreferences'] });
      toast.success('Email preferences updated');
    },
    onError: () => {
      toast.error('Failed to update preferences');
    }
  });

  const handleToggle = (field, value) => {
    updateMutation.mutate({ [field]: value });
  };

  const emailSettings = [
    {
      id: 'billing_emails',
      label: 'All Billing Emails',
      description: 'Receive all billing-related email notifications',
      icon: Mail,
      value: preference.billing_emails
    },
    {
      id: 'renewal_reminders',
      label: 'Renewal Reminders',
      description: 'Get notified 3 days before your subscription renews',
      icon: Bell,
      value: preference.renewal_reminders,
      disabled: !preference.billing_emails
    },
    {
      id: 'payment_alerts',
      label: 'Payment Alerts',
      description: 'Immediate alerts when payments fail or issues occur',
      icon: CreditCard,
      value: preference.payment_alerts,
      disabled: !preference.billing_emails
    },
    {
      id: 'upgrade_confirmations',
      label: 'Upgrade Confirmations',
      description: 'Confirmation emails when you upgrade or change plans',
      icon: TrendingUp,
      value: preference.upgrade_confirmations,
      disabled: !preference.billing_emails
    }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Email Notifications</CardTitle>
        <CardDescription>
          Customize which billing emails you'd like to receive
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {emailSettings.map((setting) => {
          const Icon = setting.icon;
          return (
            <div
              key={setting.id}
              className="flex items-start justify-between p-4 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-teal-300 dark:hover:border-teal-700 transition-colors"
            >
              <div className="flex items-start gap-3 flex-1">
                <div className="p-2 rounded-lg bg-teal-50 dark:bg-teal-950">
                  <Icon className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                </div>
                <div className="flex-1">
                  <Label
                    htmlFor={setting.id}
                    className={`font-medium cursor-pointer ${
                      setting.disabled ? 'text-slate-400' : 'text-slate-900 dark:text-slate-100'
                    }`}
                  >
                    {setting.label}
                  </Label>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                    {setting.description}
                  </p>
                </div>
              </div>
              <Switch
                id={setting.id}
                checked={setting.value}
                onCheckedChange={(checked) => handleToggle(setting.id, checked)}
                disabled={setting.disabled || updateMutation.isPending}
                className="mt-1"
              />
            </div>
          );
        })}

        <div className="mt-4 p-3 rounded-lg bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            💡 <strong>Tip:</strong> We recommend keeping payment alerts enabled to stay informed about any billing issues.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}