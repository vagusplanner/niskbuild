import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { MessageSquare, Phone, Video, MoreVertical } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ChatMessage from '../components/chat/ChatMessage';
import ChatSidebar from '../components/chat/ChatSidebar';
import MessageInput from '../components/chat/MessageInput';
import ConversationSummarizer from '../components/chat/ConversationSummarizer';
import PageAssistant from '@/components/assistant/PageAssistant';
import PullToRefresh from '@/components/mobile/PullToRefresh';
import RelatedFeaturesPanel from '@/components/navigation/RelatedFeaturesPanel';
import WhatsAppBotPanel from '@/components/chat/WhatsAppBotPanel';
import SmartChatAssistant from '@/components/chat/SmartChatAssistant';
import { toast } from 'sonner';

export default function ChatPage() {
  const [selectedChat, setSelectedChat] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [syncingGmail, setSyncingGmail] = useState(false);
  const [syncingPhone, setSyncingPhone] = useState(false);
  const messagesEndRef = useRef(null);
  const queryClient = useQueryClient();

  // Get current user
  useEffect(() => {
    base44.auth.me().then(setCurrentUser);
  }, []);

  // Fetch all messages with proper sorting
  const { data: directMessages = [] } = useQuery({
    queryKey: ['chat-messages', currentUser?.email],
    queryFn: async () => {
      if (!currentUser) return [];
      const messages = await base44.entities.Chat.list('-created_date', 500);
      // Filter messages for current user
      return messages.filter(m => 
        m.sender_email === currentUser.email || 
        m.conversation_id?.includes(currentUser.email)
      );
    },
    enabled: !!currentUser,
    refetchInterval: 3000
  });

  // Fetch group messages
  const { data: groupMessages = [] } = useQuery({
    queryKey: ['groupMessages'],
    queryFn: () => base44.entities.GroupMessage.list('-created_date', 500),
    refetchInterval: 3000
  });

  // Fetch group chats
  const { data: groupChats = [] } = useQuery({
    queryKey: ['groupChats', currentUser?.email],
    queryFn: async () => {
      if (!currentUser) return [];
      const chats = await base44.entities.GroupChat.list('-created_date');
      return chats.filter(c => c.members?.includes(currentUser.email));
    },
    enabled: !!currentUser
  });

  // Fetch contacts
  const { data: contacts = [] } = useQuery({
    queryKey: ['contacts'],
    queryFn: () => base44.entities.SocialConnection.filter({ 
      created_by: currentUser?.email 
    }),
    enabled: !!currentUser
  });

  // Build unified chat list
  const allChats = React.useMemo(() => {
    if (!currentUser) return [];
    
    const chatsMap = new Map();
    
    // Process direct messages
    directMessages.forEach(msg => {
      const convId = msg.conversation_id;
      const otherEmail = msg.sender_email === currentUser.email 
        ? msg.conversation_id.split('_').find(e => e !== currentUser.email)
        : msg.sender_email;
      
      if (!chatsMap.has(convId)) {
        chatsMap.set(convId, {
          id: convId,
          type: 'direct',
          name: msg.sender_email === currentUser.email ? otherEmail?.split('@')[0] : msg.sender_name,
          email: otherEmail,
          lastMessage: msg.message,
          lastMessageDate: msg.created_date,
          unreadCount: 0
        });
      }
      
      const chat = chatsMap.get(convId);
      if (new Date(msg.created_date) > new Date(chat.lastMessageDate)) {
        chat.lastMessage = msg.message;
        chat.lastMessageDate = msg.created_date;
      }
      if (msg.sender_email !== currentUser.email && !msg.is_read) {
        chat.unreadCount++;
      }
    });
    
    // Process group chats
    groupChats.forEach(group => {
      const groupMsgs = groupMessages.filter(m => m.group_chat_id === group.id);
      const lastMsg = groupMsgs[0];
      
      chatsMap.set(group.id, {
        id: group.id,
        type: 'group',
        name: group.name,
        members: group.members,
        lastMessage: lastMsg?.message || 'No messages yet',
        lastMessageDate: lastMsg?.created_date || group.created_date,
        unreadCount: groupMsgs.filter(m => m.sender_email !== currentUser.email && !m.is_read).length
      });
    });
    
    return Array.from(chatsMap.values())
      .sort((a, b) => new Date(b.lastMessageDate) - new Date(a.lastMessageDate));
  }, [directMessages, groupMessages, groupChats, currentUser]);

  // Get messages for selected chat with better filtering
  const currentMessages = React.useMemo(() => {
    if (!selectedChat || !currentUser) return [];
    
    if (selectedChat.type === 'direct') {
      return directMessages
        .filter(msg => msg.conversation_id === selectedChat.id)
        .sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
    } else if (selectedChat.type === 'group') {
      return groupMessages
        .filter(msg => msg.group_chat_id === selectedChat.id)
        .sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
    }
    
    return [];
  }, [selectedChat, directMessages, groupMessages, currentUser]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentMessages]);

  // Send message mutation with better delivery tracking
  const sendMessageMutation = useMutation({
    mutationFn: async ({ message, attachments }) => {
      const messageData = {
        message,
        sender_email: currentUser.email,
        sender_name: currentUser.full_name || currentUser.email,
        is_read: false,
        attachments: attachments || []
      };

      if (selectedChat.type === 'direct') {
        // Generate conversation ID if needed
        let convId = selectedChat.id;
        if (!convId.includes('_') || convId.startsWith('contact_')) {
          const emails = [currentUser.email, selectedChat.email].sort();
          convId = `${emails[0]}_${emails[1]}`;
        }
        
        // Update last_interacted for the contact
        const contact = contacts.find(c => c.friend_email === selectedChat.email);
        if (contact) {
          base44.entities.SocialConnection.update(contact.id, {
            last_interacted: new Date().toISOString()
          }).catch(console.error);
        }
        
        return base44.entities.Chat.create({
          ...messageData,
          conversation_id: convId
        });
      } else {
        return base44.entities.GroupMessage.create({
          ...messageData,
          group_chat_id: selectedChat.id,
          message_type: 'text'
        });
      }
    },
    onMutate: async ({ message, attachments }) => {
      const tempMessage = {
        id: 'temp-' + Date.now(),
        message,
        sender_email: currentUser.email,
        sender_name: currentUser.full_name || currentUser.email,
        created_date: new Date().toISOString(),
        is_read: false,
        attachments: attachments || []
      };

      if (selectedChat.type === 'direct') {
        await queryClient.cancelQueries({ queryKey: ['chat-messages'] });
        const previousMessages = queryClient.getQueryData(['chat-messages', currentUser?.email]);
        
        let convId = selectedChat.id;
        if (!convId.includes('_') || convId.startsWith('contact_')) {
          const emails = [currentUser.email, selectedChat.email].sort();
          convId = `${emails[0]}_${emails[1]}`;
        }
        
        queryClient.setQueryData(['chat-messages', currentUser?.email], (old = []) => 
          [...old, { ...tempMessage, conversation_id: convId }]
        );
        return { previousMessages };
      } else {
        await queryClient.cancelQueries({ queryKey: ['groupMessages'] });
        const previousGroupMessages = queryClient.getQueryData(['groupMessages']);
        
        queryClient.setQueryData(['groupMessages'], (old = []) => 
          [...old, { ...tempMessage, group_chat_id: selectedChat.id, message_type: 'text' }]
        );
        return { previousGroupMessages };
      }
    },
    onError: (error, variables, context) => {
      if (context?.previousMessages) {
        queryClient.setQueryData(['chat-messages', currentUser?.email], context.previousMessages);
      }
      if (context?.previousGroupMessages) {
        queryClient.setQueryData(['groupMessages'], context.previousGroupMessages);
      }
      toast.error('Failed to send message');
      console.error(error);
    },
    onSuccess: (newMessage) => {
      queryClient.invalidateQueries({ queryKey: ['chat-messages'] });
      queryClient.invalidateQueries({ queryKey: ['groupMessages'] });
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      
      // Update selected chat if it's a new conversation
      if (selectedChat.id.startsWith('contact_')) {
        const emails = [currentUser.email, selectedChat.email].sort();
        const convId = `${emails[0]}_${emails[1]}`;
        setSelectedChat({
          ...selectedChat,
          id: convId
        });
      }
    }
  });

  // Sync contacts handlers
  const handleSyncGmail = async () => {
    setSyncingGmail(true);
    try {
      const result = await base44.functions.invoke('syncGmailContacts', {});
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      toast.success(`Synced ${result.data.synced_count} contacts from Gmail`);
    } catch (error) {
      toast.error('Failed to sync Gmail contacts');
    } finally {
      setSyncingGmail(false);
    }
  };

  const handleSyncPhone = async (contactsData) => {
    setSyncingPhone(true);
    try {
      const result = await base44.functions.invoke('syncPhoneContacts', { contacts: contactsData });
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      toast.success(`Synced ${result.data.synced_count} new contacts`);
    } catch (error) {
      toast.error('Failed to sync phone contacts');
    } finally {
      setSyncingPhone(false);
    }
  };

  const handleNewChat = () => {
    toast.info('Select a contact to start chatting');
  };

  if (!currentUser) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600" />
      </div>
    );
  }

  const handleRefresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['chat-messages'] }),
      queryClient.invalidateQueries({ queryKey: ['groupMessages'] }),
      queryClient.invalidateQueries({ queryKey: ['groupChats'] }),
      queryClient.invalidateQueries({ queryKey: ['contacts'] })
    ]);
  };

  return (
    <PullToRefresh onRefresh={handleRefresh}>
    <div className="h-screen flex flex-col bg-slate-50 overflow-hidden">
      {/* Smart AI Assistant */}
      <div className="p-2 bg-white border-b">
        <SmartChatAssistant 
          conversationId={selectedChat?.type === 'direct' ? selectedChat.id : null}
          onActionComplete={() => {
            queryClient.invalidateQueries({ queryKey: ['events'] });
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
          }}
        />
      </div>
      
      <div className="flex-1 flex overflow-hidden">
      {/* Sidebar */}
      <ChatSidebar
        allChats={allChats}
        contacts={contacts}
        selectedChat={selectedChat}
        onSelectChat={setSelectedChat}
        onNewChat={handleNewChat}
        onSyncGmail={handleSyncGmail}
        onSyncPhone={handleSyncPhone}
        syncingGmail={syncingGmail}
        syncingPhone={syncingPhone}
        currentUser={currentUser}
      />
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedChat ? (
          <>
            {/* Chat Header */}
            <div className="bg-white border-b px-6 py-4 flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-3">
                <div className={`w-11 h-11 rounded-full flex items-center justify-center ${
                  selectedChat.type === 'group' 
                    ? 'bg-gradient-to-br from-indigo-400 to-purple-500' 
                    : 'bg-gradient-to-br from-teal-400 to-emerald-500'
                }`}>
                  <span className="text-white font-semibold text-lg">
                    {selectedChat.name?.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <h3 className="font-semibold text-slate-800">{selectedChat.name}</h3>
                  <p className="text-xs text-slate-500">
                    {selectedChat.email || 'Online'}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <ConversationSummarizer 
                  conversationId={selectedChat.type === 'direct' ? selectedChat.id : null}
                  groupChatId={selectedChat.type === 'group' ? selectedChat.id : null}
                />
                <Button variant="ghost" size="icon" className="h-10 w-10">
                  <Phone className="w-5 h-5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-10 w-10">
                  <Video className="w-5 h-5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-10 w-10">
                  <MoreVertical className="w-5 h-5" />
                </Button>
              </div>
            </div>

            {/* Messages */}
            <div 
              className="flex-1 overflow-y-auto p-6"
              style={{
                backgroundColor: '#f0f2f5',
                backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(0,0,0,.01) 10px, rgba(0,0,0,.01) 20px)'
              }}
            >
              {currentMessages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center text-slate-400">
                    <MessageSquare className="w-16 h-16 mx-auto mb-3 opacity-50" />
                    <p className="text-sm">No messages yet</p>
                    <p className="text-xs mt-1">Start the conversation!</p>
                  </div>
                </div>
              ) : (
                <AnimatePresence>
                  {currentMessages.map((message) => (
                    <ChatMessage
                      key={message.id}
                      message={message}
                      isOwn={message.sender_email === currentUser.email}
                      currentUserEmail={currentUser.email}
                    />
                  ))}
                </AnimatePresence>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <MessageInput 
              onSendMessage={(data) => sendMessageMutation.mutate(data)}
              disabled={sendMessageMutation.isPending}
              conversationId={selectedChat.type === 'direct' ? selectedChat.id : null}
              groupChatId={selectedChat.type === 'group' ? selectedChat.id : null}
            />
          </>
        ) : (
          <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
            <div className="max-w-2xl mx-auto space-y-6">
              <div className="text-center">
                <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center shadow-lg">
                  <MessageSquare className="w-12 h-12 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-slate-800 mb-2">
                  Start Chatting
                </h3>
                <p className="text-slate-600">
                  Select a contact to begin messaging
                </p>
              </div>

              <WhatsAppBotPanel />
            </div>
          </div>
        )}
      </div>
      </div>
    </div>
    </PullToRefresh>
  );
}