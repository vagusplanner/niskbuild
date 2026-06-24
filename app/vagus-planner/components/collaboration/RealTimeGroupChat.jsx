import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Users, MessageCircle, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { format, isToday, isYesterday } from 'date-fns';

export default function RealTimeGroupChat({ groupChatId, contextType, contextId }) {
  const [message, setMessage] = useState('');
  const [user, setUser] = useState(null);
  const scrollRef = useRef(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser);
  }, []);

  // Real-time subscription to messages
  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['groupMessages', groupChatId],
    queryFn: () => base44.entities.GroupMessage.filter({ group_chat_id: groupChatId }, '-created_date', 100),
    enabled: !!groupChatId,
    refetchInterval: 3000 // Poll every 3 seconds for new messages
  });

  const { data: groupChat } = useQuery({
    queryKey: ['groupChat', groupChatId],
    queryFn: () => base44.entities.GroupChat.get(groupChatId),
    enabled: !!groupChatId
  });

  // Subscribe to real-time updates
  useEffect(() => {
    if (!groupChatId) return;

    const unsubscribe = base44.entities.GroupMessage.subscribe((event) => {
      if (event.data.group_chat_id === groupChatId) {
        queryClient.invalidateQueries({ queryKey: ['groupMessages', groupChatId] });
      }
    });

    return unsubscribe;
  }, [groupChatId, queryClient]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const sendMessageMutation = useMutation({
    mutationFn: (messageData) => base44.entities.GroupMessage.create(messageData),
    onSuccess: () => {
      setMessage('');
      queryClient.invalidateQueries({ queryKey: ['groupMessages', groupChatId] });
    },
    onError: () => {
      toast.error('Failed to send message');
    }
  });

  const handleSend = () => {
    if (!message.trim() || !user) return;

    sendMessageMutation.mutate({
      group_chat_id: groupChatId,
      message: message.trim(),
      sender_email: user.email,
      sender_name: user.full_name,
      message_type: 'text'
    });
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatMessageTime = (timestamp) => {
    const date = new Date(timestamp);
    if (isToday(date)) {
      return format(date, 'h:mm a');
    } else if (isYesterday(date)) {
      return `Yesterday ${format(date, 'h:mm a')}`;
    }
    return format(date, 'MMM d, h:mm a');
  };

  const groupMessagesByDate = (messages) => {
    const grouped = {};
    messages.forEach(msg => {
      const date = format(new Date(msg.created_date), 'yyyy-MM-dd');
      if (!grouped[date]) grouped[date] = [];
      grouped[date].push(msg);
    });
    return grouped;
  };

  const groupedMessages = groupMessagesByDate(messages);

  return (
    <Card className="flex flex-col h-[600px]">
      <CardHeader className="border-b">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <MessageCircle className="w-5 h-5 text-teal-600" />
            Group Chat
          </CardTitle>
          {groupChat && (
            <Badge variant="outline" className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              {groupChat.members?.length || 0} members
            </Badge>
          )}
        </div>
      </CardHeader>

      <ScrollArea className="flex-1 p-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-6 h-6 animate-spin text-teal-600" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <MessageCircle className="w-12 h-12 text-slate-300 mb-3" />
            <p className="text-slate-500">No messages yet</p>
            <p className="text-sm text-slate-400 mt-1">Start the conversation!</p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedMessages).map(([date, dateMessages]) => (
              <div key={date}>
                <div className="flex items-center justify-center mb-4">
                  <Badge variant="outline" className="text-xs bg-slate-50">
                    {isToday(new Date(date)) ? 'Today' :
                     isYesterday(new Date(date)) ? 'Yesterday' :
                     format(new Date(date), 'MMMM d, yyyy')}
                  </Badge>
                </div>

                <div className="space-y-3">
                  <AnimatePresence>
                    {dateMessages.map((msg, idx) => {
                      const isOwnMessage = msg.sender_email === user?.email;
                      const showAvatar = idx === 0 || dateMessages[idx - 1].sender_email !== msg.sender_email;

                      return (
                        <motion.div
                          key={msg.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={`flex gap-3 ${isOwnMessage ? 'flex-row-reverse' : ''}`}
                        >
                          {showAvatar ? (
                            <Avatar className="w-8 h-8 bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center text-white text-sm font-medium">
                              {msg.sender_name?.charAt(0)?.toUpperCase()}
                            </Avatar>
                          ) : (
                            <div className="w-8" />
                          )}

                          <div className={`flex-1 max-w-[70%] ${isOwnMessage ? 'items-end' : 'items-start'} flex flex-col`}>
                            {showAvatar && !isOwnMessage && (
                              <span className="text-xs text-slate-600 mb-1 font-medium">
                                {msg.sender_name}
                              </span>
                            )}
                            <div className={`rounded-2xl px-4 py-2 ${
                              isOwnMessage
                                ? 'bg-gradient-to-r from-teal-600 to-cyan-600 text-white'
                                : 'bg-slate-100 text-slate-800'
                            }`}>
                              <p className="text-sm whitespace-pre-wrap break-words">{msg.message}</p>
                            </div>
                            <span className="text-xs text-slate-400 mt-1">
                              {formatMessageTime(msg.created_date)}
                            </span>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              </div>
            ))}
            <div ref={scrollRef} />
          </div>
        )}
      </ScrollArea>

      <CardContent className="border-t p-4">
        <div className="flex gap-2">
          <Input
            placeholder="Type your message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={sendMessageMutation.isPending}
          />
          <Button
            onClick={handleSend}
            disabled={!message.trim() || sendMessageMutation.isPending}
            className="bg-teal-600 hover:bg-teal-700"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}