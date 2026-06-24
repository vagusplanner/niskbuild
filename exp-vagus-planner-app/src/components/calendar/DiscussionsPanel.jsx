import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { SDK } from '@/lib/custom-sdk.js';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MessageCircle, Search, Calendar, Users, Clock, X, Pin, PinOff } from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

export default function DiscussionsPanel({ onEventClick, isPinned, onTogglePin, onClose }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [isExpanded, setIsExpanded] = useState(false);
  
  useEffect(() => {
    if (isPinned) return;
    let timeout;
    const resetTimeout = () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => setIsExpanded(false), 3000);
    };
    if (isExpanded) resetTimeout();
    return () => clearTimeout(timeout);
  }, [isExpanded, isPinned]);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => SDK.auth.me()
  });

  const { data: allMessages = [] } = useQuery({
    queryKey: ['allEventChats'],
    queryFn: () => SDK.entities.Chat.list('-created_date', 200)
  });

  const { data: events = [] } = useQuery({
    queryKey: ['events'],
    queryFn: () => SDK.entities.Event.list('-updated_date', 100)
  });

  // Group messages by conversation (event)
  const conversations = allMessages.reduce((acc, msg) => {
    if (!msg.conversation_id.startsWith('event_')) return acc;
    
    if (!acc[msg.conversation_id]) {
      acc[msg.conversation_id] = {
        conversationId: msg.conversation_id,
        messages: [],
        lastMessage: msg,
        unreadCount: 0
      };
    }
    
    acc[msg.conversation_id].messages.push(msg);
    
    // Count unread (messages not from current user)
    if (msg.sender_email !== user?.email && !msg.is_read) {
      acc[msg.conversation_id].unreadCount++;
    }
    
    // Update last message
    if (new Date(msg.created_date) > new Date(acc[msg.conversation_id].lastMessage.created_date)) {
      acc[msg.conversation_id].lastMessage = msg;
    }
    
    return acc;
  }, {});

  // Enrich with event data
  const enrichedConversations = Object.values(conversations).map(conv => {
    const eventId = conv.conversationId.replace('event_', '');
    const event = events.find(e => e.id === eventId);
    return { ...conv, event };
  }).filter(conv => conv.event); // Only show conversations with valid events

  // Filter conversations
  const filteredConversations = enrichedConversations
    .filter(conv => {
      if (activeFilter === 'unread' && conv.unreadCount === 0) return false;
      if (activeFilter === 'mentions') {
        const hasMention = conv.messages.some(m => 
          m.message.includes(`@${user?.email}`) || 
          m.message.includes(`@${user?.full_name}`)
        );
        if (!hasMention) return false;
      }
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          conv.event.title.toLowerCase().includes(query) ||
          conv.lastMessage.message.toLowerCase().includes(query)
        );
      }
      return true;
    })
    .sort((a, b) => new Date(b.lastMessage.created_date) - new Date(a.lastMessage.created_date));

  const totalUnread = enrichedConversations.reduce((sum, conv) => sum + conv.unreadCount, 0);

  const formatMessageTime = (date) => {
    const msgDate = new Date(date);
    if (isToday(msgDate)) return format(msgDate, 'h:mm a');
    if (isYesterday(msgDate)) return 'Yesterday';
    return format(msgDate, 'MMM d');
  };
  
  const shouldShowExpanded = isPinned || isExpanded;

  return (
    <motion.div
      className="h-full border-0 rounded-none shadow-none bg-white dark:bg-slate-900"
      initial={false}
      animate={{ width: shouldShowExpanded ? 320 : 56 }}
      onMouseEnter={() => !isPinned && setIsExpanded(true)}
      onMouseLeave={() => !isPinned && setIsExpanded(false)}
    >
      <AnimatePresence>
        {!shouldShowExpanded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex flex-col items-center py-4 gap-3"
          >
            <div className="flex flex-col items-center gap-2">
              <MessageCircle className="w-5 h-5 text-teal-600" />
              {totalUnread > 0 && (
                <Badge variant="destructive" className="text-[10px] px-1.5 py-0.5">
                  {totalUnread}
                </Badge>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      <AnimatePresence>
        {shouldShowExpanded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="h-full flex flex-col"
          >
      <Card className="h-full flex flex-col border-0 rounded-none shadow-none">
      <CardHeader className="border-b border-slate-200 dark:border-slate-800 pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-teal-600" />
            Discussions
            {totalUnread > 0 && (
              <Badge variant="destructive" className="ml-2">
                {totalUnread}
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-1">
            {onClose && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="lg:hidden"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={onTogglePin}
              className={cn("hidden lg:flex", isPinned && "text-teal-600 bg-teal-50")}
            >
              {isPinned ? <Pin className="w-4 h-4" /> : <PinOff className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="mt-3 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search conversations..."
            className="pl-9"
          />
        </div>

        {/* Filters */}
        <Tabs value={activeFilter} onValueChange={setActiveFilter} className="mt-3">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="unread">
              Unread {totalUnread > 0 && `(${totalUnread})`}
            </TabsTrigger>
            <TabsTrigger value="mentions">@Mentions</TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>

      <CardContent className="flex-1 overflow-y-auto p-0">
        {filteredConversations.length === 0 ? (
          <div className="text-center py-12 px-4">
            <MessageCircle className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p className="text-sm text-slate-500">
              {searchQuery ? 'No conversations found' : 
               activeFilter === 'unread' ? 'No unread messages' :
               activeFilter === 'mentions' ? 'No mentions' :
               'No discussions yet'}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Start a conversation by chatting on an event
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            <AnimatePresence>
              {filteredConversations.map((conv) => {
                const hasMention = conv.messages.some(m => 
                  (m.message.includes(`@${user?.email}`) || 
                   m.message.includes(`@${user?.full_name}`)) &&
                  m.sender_email !== user?.email
                );

                return (
                  <motion.button
                    key={conv.conversationId}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    onClick={() => onEventClick(conv.event)}
                    className={cn(
                      "w-full text-left p-4 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors",
                      conv.unreadCount > 0 && "bg-teal-50/50 dark:bg-teal-950/20"
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Calendar className="w-3 h-3 text-slate-400 flex-shrink-0" />
                          <h4 className={cn(
                            "font-medium text-sm truncate",
                            conv.unreadCount > 0 && "font-semibold text-teal-700 dark:text-teal-400"
                          )}>
                            {conv.event.title}
                          </h4>
                        </div>

                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs text-slate-500">
                            {conv.lastMessage.sender_name}:
                          </span>
                          <p className={cn(
                            "text-xs truncate flex-1",
                            conv.unreadCount > 0 ? "text-slate-900 dark:text-slate-100 font-medium" : "text-slate-500"
                          )}>
                            {conv.lastMessage.message}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                          <div className="flex items-center gap-1 text-xs text-slate-400">
                            <Clock className="w-3 h-3" />
                            {formatMessageTime(conv.lastMessage.created_date)}
                          </div>
                          <div className="flex items-center gap-1 text-xs text-slate-400">
                            <Users className="w-3 h-3" />
                            {conv.messages.length} messages
                          </div>
                          {hasMention && (
                            <Badge variant="secondary" className="text-xs px-1.5 py-0">
                              @
                            </Badge>
                          )}
                        </div>
                      </div>

                      {conv.unreadCount > 0 && (
                        <Badge variant="default" className="bg-teal-600 flex-shrink-0">
                          {conv.unreadCount}
                        </Badge>
                      )}
                    </div>
                  </motion.button>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </CardContent>
    </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}