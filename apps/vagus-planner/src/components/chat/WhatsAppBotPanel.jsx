import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, ExternalLink } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';

export default function WhatsAppBotPanel() {
  const whatsappURL = base44.agents.getWhatsAppConnectURL('chat_assistant');

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 border-green-200 dark:border-green-800">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500 rounded-lg">
                <MessageCircle className="w-6 h-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-green-900 dark:text-green-100">
                  WhatsApp Chat Assistant
                </CardTitle>
                <CardDescription className="text-green-700 dark:text-green-300">
                  Chat with your AI assistant via WhatsApp
                </CardDescription>
              </div>
            </div>
            <Badge className="bg-green-500 text-white">Available</Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="space-y-2 text-sm text-green-800 dark:text-green-200">
            <p>Connect to chat with your AI assistant directly on WhatsApp:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Ask questions and get instant responses</li>
              <li>Manage tasks and reminders</li>
              <li>Get personalized suggestions</li>
              <li>Available 24/7 on your phone</li>
            </ul>
          </div>

          <a href={whatsappURL} target="_blank" rel="noopener noreferrer" className="block">
            <Button className="w-full bg-green-500 hover:bg-green-600 text-white">
              <MessageCircle className="w-4 h-4 mr-2" />
              Connect on WhatsApp
              <ExternalLink className="w-4 h-4 ml-2" />
            </Button>
          </a>

          <p className="text-xs text-green-600 dark:text-green-400 text-center">
            Your account will be securely connected to WhatsApp
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );
}