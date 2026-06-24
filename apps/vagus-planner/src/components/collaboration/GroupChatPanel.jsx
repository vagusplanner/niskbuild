import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Send, Users, CheckSquare, Loader2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function GroupChatPanel({ groupChatId, contextType, contextData }) {
  const [message, setMessage] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const messagesEndRef = useRef(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setCurrentUser);
  }, []);

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['group-messages', groupChatId],
    queryFn: () => base44.entities.GroupMessage.filter({ group_chat_id: groupChatId }, '-created_date', 100),
    refetchInterval: 3000,
    enabled: !!groupChatId
  });

  const sendMessageMutation = useMutation({
    mutationFn: (data) => base44.entities.GroupMessage.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-messages', groupChatId] });
      setMessage('');
    }
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!message.trim() || !currentUser) return;

    sendMessageMutation.mutate({
      group_chat_id: groupChatId,
      message: message.trim(),
      sender_email: currentUser.email,
      sender_name: currentUser.full_name || currentUser.email,
      message_type: 'text'
    });
  };

  const sortedMessages = [...messages].sort((a, b) => 
    new Date(a.created_date) - new Date(b.created_date)
  );

  return (
    <div className="flex flex-col h-full bg-white rounded-xl border shadow-sm">
      <div className="p-4 border-b bg-gradient-to-r from-indigo-50 to-purple-50">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-indigo-600" />
          <div>
            <h3 className="font-semibold text-slate-800">
              {contextType === 'event' && `Event Discussion: ${contextData?.title}`}
              {contextType === 'goal' && `Goal Team: ${contextData?.title}`}
              {contextType === 'holiday' && `Trip Planning: ${contextData?.title}`}
              {contextType === 'general' && 'Group Chat'}
            </h3>
            <p className="text-xs text-slate-500">{messages.length} messages</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-3">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
          </div>
        ) : sortedMessages.length > 0 ? (
          sortedMessages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${msg.sender_email === currentUser?.email ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[75%] ${msg.message_type === 'system' ? 'w-full' : ''}`}>
                {msg.message_type === 'system' ? (
                  <div className="text-center py-2">
                    <Badge variant="outline" className="bg-slate-50">
                      {msg.message}
                    </Badge>
                  </div>
                ) : (
                  <div
                    className={`p-3 rounded-xl ${
                      msg.sender_email === currentUser?.email
                        ? 'bg-indigo-600 text-white rounded-br-md'
                        : 'bg-slate-100 text-slate-800 rounded-bl-md'
                    }`}
                  >
                    {msg.sender_email !== currentUser?.email && (
                      <p className="text-xs font-medium mb-1 opacity-70">
                        {msg.sender_name}
                      </p>
                    )}
                    <p className="text-sm">{msg.message}</p>
                    <p className="text-xs mt-1 opacity-60">
                      {format(new Date(msg.created_date), 'HH:mm')}
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          ))
        ) : (
          <div className="flex items-center justify-center h-full text-slate-400 text-sm">
            No messages yet. Start the conversation!
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 border-t">
        <form onSubmit={handleSend} className="flex gap-2">
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1"
            disabled={!currentUser}
          />
          <Button
            type="submit"
            disabled={!message.trim() || !currentUser}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}