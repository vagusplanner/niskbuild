import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { base44 } from '@/api/base44Client';
import { Mail, MessageSquare, HelpCircle, FileText, Send } from 'lucide-react';
import { toast } from 'sonner';

export default function SupportPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    category: 'general',
    subject: '',
    message: ''
  });
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSending(true);

    try {
      await base44.integrations.Core.SendEmail({
        to: 'support@myassistant.com',
        subject: `Support Request: ${formData.subject}`,
        body: `
Name: ${formData.name}
Email: ${formData.email}
Category: ${formData.category}

Message:
${formData.message}
        `
      });

      toast.success('Support request sent! We\'ll respond within 24 hours.');
      setFormData({
        name: '',
        email: '',
        category: 'general',
        subject: '',
        message: ''
      });
    } catch (error) {
      toast.error('Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-teal-50 py-12 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <Card className="shadow-xl">
          <CardHeader className="bg-gradient-to-r from-teal-600 to-cyan-600 text-white">
            <div className="flex items-center gap-3">
              <HelpCircle className="w-8 h-8" />
              <div>
                <CardTitle className="text-2xl">Support & Contact</CardTitle>
                <CardDescription className="text-teal-100">
                  We're here to help
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <div className="p-4 bg-blue-50 rounded-lg text-center">
                <Mail className="w-6 h-6 text-blue-600 mx-auto mb-2" />
                <h3 className="font-semibold text-blue-900 mb-1">Email Support</h3>
                <p className="text-xs text-slate-600">support@myassistant.com</p>
                <p className="text-xs text-slate-500 mt-1">Response within 24h</p>
              </div>
              <div className="p-4 bg-purple-50 rounded-lg text-center">
                <MessageSquare className="w-6 h-6 text-purple-600 mx-auto mb-2" />
                <h3 className="font-semibold text-purple-900 mb-1">Live Chat</h3>
                <p className="text-xs text-slate-600">Available 9am-5pm GMT</p>
                <p className="text-xs text-slate-500 mt-1">Instant responses</p>
              </div>
              <div className="p-4 bg-emerald-50 rounded-lg text-center">
                <FileText className="w-6 h-6 text-emerald-600 mx-auto mb-2" />
                <h3 className="font-semibold text-emerald-900 mb-1">Help Center</h3>
                <p className="text-xs text-slate-600">FAQs & Guides</p>
                <p className="text-xs text-slate-500 mt-1">Self-service help</p>
              </div>
            </div>

            {/* Contact Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Your Name *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter your name"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email Address *</Label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="your@email.com"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Category *</Label>
                <Select
                  value={formData.category}
                  onValueChange={(val) => setFormData({ ...formData, category: val })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General Inquiry</SelectItem>
                    <SelectItem value="technical">Technical Issue</SelectItem>
                    <SelectItem value="prayer">Prayer Times</SelectItem>
                    <SelectItem value="calendar">Calendar & Events</SelectItem>
                    <SelectItem value="billing">Billing & Subscription</SelectItem>
                    <SelectItem value="privacy">Privacy & Data</SelectItem>
                    <SelectItem value="feature">Feature Request</SelectItem>
                    <SelectItem value="bug">Report a Bug</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Subject *</Label>
                <Input
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  placeholder="Brief description of your inquiry"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Message *</Label>
                <Textarea
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder="Please provide details about your inquiry..."
                  rows={6}
                  required
                />
              </div>

              <Button
                type="submit"
                disabled={sending}
                className="w-full bg-teal-600 hover:bg-teal-700"
              >
                {sending ? (
                  'Sending...'
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Send Message
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* FAQ */}
        <Card>
          <CardHeader>
            <CardTitle>Frequently Asked Questions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-slate-50 rounded-lg">
              <h4 className="font-semibold text-slate-800 mb-2">How accurate are the prayer times?</h4>
              <p className="text-sm text-slate-600">
                We use authenticated calculation methods recognized by Islamic scholars. Times are calculated based on your location and selected method.
              </p>
            </div>
            <div className="p-4 bg-slate-50 rounded-lg">
              <h4 className="font-semibold text-slate-800 mb-2">Is my data secure?</h4>
              <p className="text-sm text-slate-600">
                Yes. We use industry-standard encryption and security measures. See our Privacy Policy for details.
              </p>
            </div>
            <div className="p-4 bg-slate-50 rounded-lg">
              <h4 className="font-semibold text-slate-800 mb-2">Can I use the app offline?</h4>
              <p className="text-sm text-slate-600">
                Yes! Core features like prayer logging, Quran reading, and viewing your calendar work offline.
              </p>
            </div>
            <div className="p-4 bg-slate-50 rounded-lg">
              <h4 className="font-semibold text-slate-800 mb-2">How do I delete my account?</h4>
              <p className="text-sm text-slate-600">
                Go to Settings → Data Protection to export your data or delete your account permanently.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}