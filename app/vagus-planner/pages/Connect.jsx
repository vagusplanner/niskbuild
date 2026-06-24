import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  MessageCircle, Users, Phone, Video, Search,
  ChevronLeft, UserPlus, Shield, Mail, RefreshCw, Contact, Pin, Share2
} from 'lucide-react';
import ConversationSummarizer from '@/components/chat/ConversationSummarizer';
import TypingIndicator from '@/components/chat/TypingIndicator';
import ProfileShareCard from '@/components/chat/ProfileShareCard';
import { AnimatePresence as AP } from 'framer-motion';
import ChatToAction from '@/components/connect/ChatToAction';
import { Button } from '@/components/ui/button';
import { format, isToday, isYesterday } from 'date-fns';
import ChatBubble from '@/components/chat/ChatBubble';
import MessageInput from '@/components/chat/MessageInput';
import DailyCallModal from '@/components/chat/DailyCallModal';
import NewGroupModal from '@/components/chat/NewGroupModal';
import UserSearchModal from '@/components/chat/UserSearchModal';
import UserProfileCard, { StatusDot } from '@/components/chat/UserProfileCard';
import StatusPicker from '@/components/chat/StatusPicker';
import ContextBanner from '@/components/chat/ContextBanner';
import MosqueChannelDirectory from '@/components/mosque/MosqueChannelDirectory';

// ─── Helpers ───────────────────────────────────────────────────────────────

function formatChatDate(dateStr, t) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isToday(d)) return format(d, 'HH:mm');
  if (isYesterday(d)) return t('common.yesterday');
  return format(d, 'MMM d');
}

function avatarColor(name = '') {
  const colors = [
    'from-teal-400 to-emerald-500',
    'from-purple-400 to-indigo-500',
    'from-rose-400 to-pink-500',
    'from-amber-400 to-orange-500',
    'from-sky-400 to-blue-500',
  ];
  return colors[name.charCodeAt(0) % colors.length];
}

// ─── Sidebar Chat Item ──────────────────────────────────────────────────────

function ChatItem({ chat, isSelected, onClick, status, isPinned, onTogglePin, t }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-3 px-4 py-3.5 transition-all text-left border-b border-slate-100 dark:border-slate-800 group',
        isSelected
        ? 'bg-blue-50 dark:bg-blue-950/20 border-l-2 border-l-[#1D6FB8]'
          : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
      )}
    >
      <div className="relative flex-shrink-0">
        <div className={cn(
          'w-11 h-11 rounded-full bg-gradient-to-br flex items-center justify-center text-white font-bold shadow-sm',
          avatarColor(chat.name)
        )}>
          {chat.type === 'group'
            ? <Users className="w-5 h-5" />
            : chat.name?.charAt(0).toUpperCase()
          }
        </div>
        {chat.type === 'direct' && status && (
          <span className="absolute bottom-0 right-0">
            <StatusDot status={status} size="sm" />
          </span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-sm text-slate-800 dark:text-slate-100 truncate">{chat.name}</span>
          <span className="text-[11px] text-slate-400 flex-shrink-0 ml-2">{formatChatDate(chat.lastMessageDate, t)}</span>
        </div>
        <div className="flex items-center justify-between mt-0.5">
          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{chat.lastMessage || t('connect.typeMessage')}</p>
          {chat.unreadCount > 0 && (
            <span className="ml-2 flex-shrink-0 w-5 h-5 rounded-full bg-[#1D6FB8] text-white text-[10px] font-bold flex items-center justify-center">
              {chat.unreadCount > 9 ? '9+' : chat.unreadCount}
            </span>
          )}
        </div>
      </div>
      {onTogglePin && (
        <button
          onClick={(e) => { e.stopPropagation(); onTogglePin(chat.id); }}
          className={cn(
            'p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all flex-shrink-0',
            isPinned ? 'text-amber-500' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
          )}
          title={isPinned ? t('connect.unpin') : t('connect.pin')}
        >
          <Pin className={cn('w-4 h-4', isPinned && 'fill-current')} />
        </button>
      )}
    </button>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function ConnectPage() {
  const { t } = useTranslation();
  const [selectedChat, setSelectedChat] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [showCall, setShowCall] = useState(null); // 'audio' | 'video'
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [showUserSearch, setShowUserSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [profileAnchor, setProfileAnchor] = useState(null); // { user, rect }
  const [activeTab, setActiveTab] = useState('direct'); // 'direct' | 'groups' | 'contacts' | 'mosque'
  const [syncing, setSyncing] = useState(false);
  const [showShareCard, setShowShareCard] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteSending, setInviteSending] = useState(false);
  const [typingUsers, setTypingUsers] = useState({}); // { [chatId]: [name, ...] }
  const typingTimerRef = useRef(null);
  const [pinnedChats, setPinnedChats] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('pinnedChats') || '[]');
    } catch {
      return [];
    }
  });
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const queryClient = useQueryClient();

  const togglePin = (chatId) => {
    setPinnedChats(prev => {
      const updated = prev.includes(chatId)
        ? prev.filter(id => id !== chatId)
        : [chatId, ...prev];
      localStorage.setItem('pinnedChats', JSON.stringify(updated));
      return updated;
    });
  };

  useEffect(() => {
    base44.auth.me().then(user => {
      setCurrentUser(user);
      if (user) {
        base44.auth.updateMe({ status: 'online', status_updated_at: new Date().toISOString() });
      }
    });
  }, []);

  // ── Data fetching ──────────────────────────────────────────────────────

  const { data: allUsers = [] } = useQuery({
    queryKey: ['allUsers'],
    queryFn: () => base44.entities.User.list(),
    refetchInterval: 15000
  });

  const getUserStatus = (email) => {
    const u = allUsers.find(u => u.email === email);
    return u?.status || 'offline';
  };

  const getUserProfile = (email) => allUsers.find(u => u.email === email);

  const { data: directMessages = [] } = useQuery({
    queryKey: ['chat-messages', currentUser?.email],
    queryFn: async () => {
      if (!currentUser) return [];
      const msgs = await base44.entities.Chat.list('-created_date', 500);
      return msgs.filter(m =>
        m.sender_email === currentUser.email ||
        m.conversation_id?.includes(currentUser.email)
      );
    },
    enabled: !!currentUser,
    refetchInterval: 3000
  });

  const { data: groupChats = [] } = useQuery({
    queryKey: ['groupChats', currentUser?.email],
    queryFn: async () => {
      if (!currentUser) return [];
      const chats = await base44.entities.GroupChat.list('-created_date');
      return chats.filter(c => c.members?.includes(currentUser.email));
    },
    enabled: !!currentUser,
    refetchInterval: 5000
  });

  const { data: groupMessages = [] } = useQuery({
    queryKey: ['groupMessages'],
    queryFn: () => base44.entities.GroupMessage.list('-created_date', 500),
    enabled: groupChats.length > 0,
    refetchInterval: 3000
  });

  // Real-time subscription
  useEffect(() => {
    if (!currentUser) return;
    const unsub = base44.entities.Chat.subscribe((event) => {
      if (event.type === 'create' && event.data?.conversation_id?.includes(currentUser.email)) {
        queryClient.invalidateQueries({ queryKey: ['chat-messages'] });
      }
    });
    return unsub;
  }, [currentUser, queryClient]);

  // ── Build chat list ────────────────────────────────────────────────────

  const allChats = React.useMemo(() => {
    if (!currentUser) return [];
    const map = new Map();

    directMessages.forEach(msg => {
      const convId = msg.conversation_id;
      const otherEmail = msg.sender_email === currentUser.email
        ? convId.split('_').find(e => e !== currentUser.email)
        : msg.sender_email;
      if (!map.has(convId)) {
        map.set(convId, {
          id: convId, type: 'direct',
          name: msg.sender_email === currentUser.email
            ? (otherEmail?.split('@')[0] || otherEmail)
            : (msg.sender_name || msg.sender_email?.split('@')[0]),
          email: otherEmail,
          lastMessage: msg.message,
          lastMessageDate: msg.created_date,
          unreadCount: 0
        });
      }
      const chat = map.get(convId);
      if (new Date(msg.created_date) > new Date(chat.lastMessageDate)) {
        chat.lastMessage = msg.message;
        chat.lastMessageDate = msg.created_date;
      }
      if (msg.sender_email !== currentUser.email && !msg.is_read) chat.unreadCount++;
    });

    groupChats.forEach(group => {
      const gMsgs = groupMessages.filter(m => m.group_chat_id === group.id);
      const last = gMsgs[0];
      map.set(group.id, {
        id: group.id, type: 'group',
        name: group.name,
        members: group.members,
        lastMessage: last?.message || '',
        lastMessageDate: last?.created_date || group.created_date,
        unreadCount: gMsgs.filter(m => m.sender_email !== currentUser.email && !m.is_read).length
      });
    });

    return Array.from(map.values())
      .sort((a, b) => new Date(b.lastMessageDate) - new Date(a.lastMessageDate));
  }, [directMessages, groupMessages, groupChats, currentUser]);

  const directChats = allChats.filter(c => c.type === 'direct');
  const groupChatsList = allChats.filter(c => c.type === 'group');

  const baseChats = (activeTab === 'groups' ? groupChatsList : directChats).filter(c =>
    !searchQuery || c.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  const pinnedList = baseChats.filter(c => pinnedChats.includes(c.id));
  const unpinnedList = baseChats.filter(c => !pinnedChats.includes(c.id));
  const filteredChats = [...pinnedList, ...unpinnedList];

  // Contacts from all users (excluding self)
  const contacts = allUsers.filter(u => u.email !== currentUser?.email);
  const filteredContacts = contacts.filter(u =>
    !searchQuery ||
    u.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Typing indicator: broadcast typing state via localStorage (cross-tab simulation) and polling
  const handleTyping = () => {
    if (!selectedChat || !currentUser) return;
    const key = `typing_${selectedChat.id}`;
    const entry = { name: currentUser.full_name || currentUser.email.split('@')[0], ts: Date.now() };
    try { localStorage.setItem(key, JSON.stringify(entry)); } catch (_) {}
    clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      try { localStorage.removeItem(key); } catch (_) {}
    }, 3000);
  };

  // Poll typing state for active chat
  useEffect(() => {
    if (!selectedChat || !currentUser) return;
    const interval = setInterval(() => {
      const key = `typing_${selectedChat.id}`;
      try {
        const raw = localStorage.getItem(key);
        if (!raw) { setTypingUsers(p => ({ ...p, [selectedChat.id]: [] })); return; }
        const entry = JSON.parse(raw);
        if (Date.now() - entry.ts > 3500) {
          setTypingUsers(p => ({ ...p, [selectedChat.id]: [] }));
        } else if (entry.name !== (currentUser.full_name || currentUser.email.split('@')[0])) {
          setTypingUsers(p => ({ ...p, [selectedChat.id]: [entry.name] }));
        }
      } catch (_) {}
    }, 500);
    return () => clearInterval(interval);
  }, [selectedChat?.id, currentUser]);

  const sendInvite = async () => {
    if (!inviteEmail.trim()) return;
    setInviteSending(true);
    try {
      await base44.functions.invoke('inviteToConnect', { invitee_email: inviteEmail.trim() });
      toast.success('Invite sent to ' + inviteEmail);
      setInviteEmail('');
      setShowInviteModal(false);
    } catch (e) {
      toast.error('Failed to send invite');
    }
    setInviteSending(false);
  };

  const handleSyncGmail = async () => {
    setSyncing(true);
    try {
      await base44.functions.invoke('syncGmailContacts', {});
      queryClient.invalidateQueries({ queryKey: ['allUsers'] });
      toast.success('Gmail contacts synced!');
    } catch (e) {
      toast.error('Failed to sync Gmail contacts');
    }
    setSyncing(false);
  };

  const handleSyncPhone = async () => {
    setSyncing(true);
    try {
      await base44.functions.invoke('syncPhoneContacts', {});
      queryClient.invalidateQueries({ queryKey: ['allUsers'] });
      toast.success('Phone contacts synced!');
    } catch (e) {
      toast.error('Failed to sync phone contacts');
    }
    setSyncing(false);
  };

  // ── Current messages ───────────────────────────────────────────────────

  const currentMessages = React.useMemo(() => {
    if (!selectedChat || !currentUser) return [];
    if (selectedChat.type === 'direct') {
      return directMessages
        .filter(m => m.conversation_id === selectedChat.id)
        .sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
    }
    return groupMessages
      .filter(m => m.group_chat_id === selectedChat.id)
      .sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
  }, [selectedChat, directMessages, groupMessages, currentUser]);

  // Mark messages as read when chat opens
  useEffect(() => {
    if (!selectedChat || !currentUser) return;
    const unreadIds = currentMessages
      .filter(m => m.sender_email !== currentUser.email && !m.is_read)
      .map(m => m.id);
    if (unreadIds.length === 0) return;
    const entity = selectedChat.type === 'direct' ? base44.entities.Chat : base44.entities.GroupMessage;
    unreadIds.forEach(id => entity.update(id, { is_read: true }).catch(() => {}));
  }, [selectedChat?.id, currentMessages.length]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentMessages.length]);

  // ── Send message ───────────────────────────────────────────────────────

  const sendMutation = useMutation({
    mutationFn: async ({ message, reply_to, metadata, attachments }) => {
      const base = {
        message,
        sender_email: currentUser.email,
        sender_name: currentUser.full_name || currentUser.email.split('@')[0],
        is_read: false,
        ...(reply_to ? { reply_to } : {}),
        ...(metadata ? { metadata } : {}),
      };
      if (selectedChat.type === 'direct') {
        return base44.entities.Chat.create({ ...base, conversation_id: selectedChat.id });
      }
      return base44.entities.GroupMessage.create({ ...base, group_chat_id: selectedChat.id, message_type: 'text' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-messages'] });
      queryClient.invalidateQueries({ queryKey: ['groupMessages'] });
    },
    onError: () => toast.error('Failed to send message')
  });

  // React to a message
  const reactToMessage = async (message, emoji) => {
    const entity = selectedChat.type === 'direct' ? base44.entities.Chat : base44.entities.GroupMessage;
    const reactions = { ...(message.reactions || {}) };
    // Toggle: if user already reacted with this emoji, remove it (just decrement)
    reactions[emoji] = (reactions[emoji] || 0) + 1;
    // Remove zero counts
    if (reactions[emoji] <= 0) delete reactions[emoji];
    await entity.update(message.id, { reactions });
    queryClient.invalidateQueries({ queryKey: ['chat-messages'] });
    queryClient.invalidateQueries({ queryKey: ['groupMessages'] });
  };

  if (!currentUser) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-teal-600" />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100dvh-8rem)] lg:h-[calc(100dvh-2rem)] rounded-2xl overflow-hidden bg-gradient-to-br from-blue-50/40 via-slate-50/30 to-slate-50 dark:from-slate-950 dark:via-blue-950/10 dark:to-slate-950 border border-blue-100/50 dark:border-blue-900/30 shadow-xl">

      {/* ── SIDEBAR ──────────────────────────────────────────────────── */}
      <div className={cn(
        'flex flex-col border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900',
        'w-full lg:w-80 xl:w-96',
        selectedChat ? 'hidden lg:flex' : 'flex'
      )}>
        {/* Header */}
        <div className="px-4 pt-4 pb-3 text-white" style={{background:'linear-gradient(135deg, #1B2A4A 0%, #0D4F6C 50%, #1D6FB8 100%)'}}>
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 opacity-70" />
              <h1 className="font-bold text-base">{t('connect.title')}</h1>
            </div>
            <div className="flex gap-1">
              <button
                onClick={() => setShowShareCard(true)}
                className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors"
                title="Share your profile"
              >
                <Share2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setShowInviteModal(true)}
                className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors"
                title="Invite by email"
              >
                <UserPlus className="w-4 h-4" />
              </button>
              <button
                onClick={() => setShowUserSearch(true)}
                className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors"
                title={t('connect.newMessage')}
              >
                <MessageCircle className="w-4 h-4" />
              </button>
              <button
                onClick={() => setShowNewGroup(true)}
                className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors"
                title={t('connect.newGroup')}
              >
                <Users className="w-4 h-4" />
              </button>
            </div>
          </div>
          {/* My status picker */}
          <div className="mb-3">
            <StatusPicker
              currentUser={currentUser}
              onStatusChange={(s) => setCurrentUser(u => ({ ...u, status: s }))}
            />
          </div>
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/60" />
            <input
              placeholder={t('connect.search')}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-white/15 text-white placeholder-white/60 text-sm rounded-xl pl-9 pr-3 py-2 outline-none focus:bg-white/25 transition-colors"
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          {[
            { id: 'direct', label: t('connect.messages'), icon: MessageCircle, count: directChats.length },
            { id: 'groups', label: t('connect.groups'), icon: Users, count: groupChatsList.length },
            { id: 'contacts', label: t('connect.contacts'), icon: Contact, count: contacts.length },
            { id: 'mosque', label: 'Mosques', icon: Shield, count: 0 },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-semibold transition-colors relative',
                activeTab === tab.id
                  ? 'text-[#1D6FB8] dark:text-[#29ABE2]'
                  : 'text-slate-400 dark:text-slate-500 hover:text-slate-600'
              )}
            >
              <tab.icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.count > 0 && (
                <span className={cn(
                  'text-[9px] font-bold px-1 rounded-full',
                  activeTab === tab.id ? 'text-teal-600' : 'text-slate-400'
                )}>{tab.count}</span>
              )}
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 rounded-t-full" style={{background:'#1D6FB8'}} />
              )}
            </button>
          ))}
        </div>

        {/* Chat list / Contacts */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'mosque' ? (
            <div className="p-3">
              <MosqueChannelDirectory
                currentUser={currentUser}
                onJoinChat={(mosque) => {
                  // Navigate to groups tab with the just-joined group chat
                  setActiveTab('groups');
                  queryClient.invalidateQueries({ queryKey: ['groupChats'] });
                }}
              />
            </div>
          ) : activeTab === 'contacts' ? (
            <div className="flex-1 overflow-y-auto">
              {filteredContacts.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center px-6 py-12">
                  <div className="w-16 h-16 rounded-full bg-teal-50 dark:bg-teal-950/30 flex items-center justify-center mb-3">
                    <Contact className="w-8 h-8 text-teal-400" />
                  </div>
                  <p className="font-semibold text-slate-700 dark:text-slate-300 mb-1">No contacts yet</p>
                  <p className="text-xs text-slate-400 mb-4">Invite people to Vagus Planner to see them here.</p>
                  <Button size="sm" className="bg-[#1D6FB8] hover:bg-[#2980B9]" onClick={() => setShowInviteModal(true)}>
                    <UserPlus className="w-4 h-4 mr-1.5" /> Invite Someone
                  </Button>
                </div>
              ) : (
                filteredContacts.map(contact => (
                  <button key={contact.id}
                    onClick={() => {
                      const convId = [currentUser.email, contact.email].sort().join('_');
                      setSelectedChat({ id: convId, type: 'direct', name: contact.full_name || contact.email.split('@')[0], email: contact.email });
                      setActiveTab('direct');
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3.5 transition-all text-left border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <div className={cn('w-11 h-11 rounded-full bg-gradient-to-br flex items-center justify-center text-white font-bold shadow-sm flex-shrink-0', avatarColor(contact.full_name || contact.email))}>
                      {(contact.full_name || contact.email).charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-slate-800 dark:text-slate-100 truncate">{contact.full_name || contact.email.split('@')[0]}</p>
                      <p className="text-xs text-slate-400 truncate">{contact.email}</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <StatusDot status={getUserStatus(contact.email)} size="sm" />
                      <MessageCircle className="w-4 h-4 text-teal-500" />
                    </div>
                  </button>
                ))
              )}
            </div>
          ) : (
            <>
              {pinnedList.length > 0 && (
                <>
                  <div className="px-4 py-2 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 sticky top-0">
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">⭐ {t('connect.pinned').toUpperCase()}</p>
                  </div>
                  {pinnedList.map(chat => (
                    <ChatItem
                      key={chat.id}
                      chat={chat}
                      isSelected={selectedChat?.id === chat.id}
                      onClick={() => setSelectedChat(chat)}
                      status={chat.type === 'direct' ? getUserStatus(chat.email) : null}
                      isPinned={true}
                      onTogglePin={togglePin}
                      t={t}
                    />
                  ))}
                </>
              )}
              {unpinnedList.length > 0 && pinnedList.length > 0 && (
                <div className="px-4 py-2 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 sticky top-12">
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">{t('connect.allMessages').toUpperCase()}</p>
                </div>
              )}
              {unpinnedList.map(chat => (
                <ChatItem
                  key={chat.id}
                  chat={chat}
                  isSelected={selectedChat?.id === chat.id}
                  onClick={() => setSelectedChat(chat)}
                  status={chat.type === 'direct' ? getUserStatus(chat.email) : null}
                  isPinned={false}
                  onTogglePin={togglePin}
                  t={t}
                />
              ))}
            </>
          )}
        </div>

        {/* Exclusive badge */}
        <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2 text-xs text-slate-400">
          <Shield className="w-3.5 h-3.5 text-[#29ABE2]" />
          {t('connect.exclusiveNote')}
        </div>
      </div>

      {/* ── CHAT AREA ────────────────────────────────────────────────── */}
      <div className={cn(
        'flex-1 flex flex-col',
        selectedChat ? 'flex' : 'hidden lg:flex'
      )}>
        {selectedChat ? (
          <>
            {/* Context banner for linked chats */}
            <ContextBanner chat={selectedChat} />

            {/* Chat header */}
            <div className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-sm">
              <button
                onClick={() => setSelectedChat(null)}
                className="lg:hidden p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
              >
                <ChevronLeft className="w-5 h-5 text-slate-600 dark:text-slate-400" />
              </button>

              <button
                className="relative flex-shrink-0"
                onClick={(e) => {
                  if (selectedChat.type !== 'direct') return;
                  const profile = getUserProfile(selectedChat.email);
                  if (profile) setProfileAnchor({ user: profile, rect: e.currentTarget.getBoundingClientRect() });
                }}
              >
                <div className={cn(
                  'w-10 h-10 rounded-full bg-gradient-to-br flex items-center justify-center text-white font-bold shadow-sm',
                  avatarColor(selectedChat.name)
                )}>
                  {selectedChat.type === 'group'
                    ? <Users className="w-5 h-5" />
                    : selectedChat.name?.charAt(0).toUpperCase()
                  }
                </div>
                {selectedChat.type === 'direct' && (
                  <span className="absolute bottom-0 right-0">
                    <StatusDot status={getUserStatus(selectedChat.email)} size="sm" />
                  </span>
                )}
              </button>

              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-800 dark:text-slate-100 text-sm">{selectedChat.name}</p>
                <p className="text-xs text-[#1D6FB8] dark:text-[#29ABE2]">
                  {selectedChat.type === 'group'
                    ? `${selectedChat.members?.length} ${t('connect.contacts')}`
                    : (() => {
                        const s = getUserStatus(selectedChat.email);
                        return s === 'online' ? `🟢 ${t('connect.online')}` : s === 'away' ? `🟡 ${t('connect.away')}` : s === 'in_a_call' ? `🔴 ${t('connect.inCall')}` : `⚫ ${t('connect.offline')}`;
                      })()
                  }
                </p>
              </div>

              <div className="flex items-center gap-1">
                <ConversationSummarizer
                  conversationId={selectedChat.type === 'direct' ? selectedChat.id : null}
                  groupChatId={selectedChat.type === 'group' ? selectedChat.id : null}
                />
                <button
                  onClick={() => setShowCall('audio')}
                  className="w-9 h-9 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition-colors"
                  title={t('connect.callAudio')}
                >
                  <Phone className="w-4 h-4 text-[#1D6FB8]" />
                </button>
                <button
                  onClick={() => setShowCall('video')}
                  className="w-9 h-9 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition-colors"
                  title={t('connect.callVideo')}
                >
                  <Video className="w-4 h-4 text-[#1D6FB8]" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div
              className="flex-1 overflow-y-auto px-3 sm:px-5 py-4 bg-gradient-to-br from-blue-50/30 via-slate-50/40 to-slate-50 dark:from-slate-950 dark:via-blue-950/10 dark:to-slate-900"
            >
              {currentMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <div className={cn('w-16 h-16 rounded-full bg-gradient-to-br flex items-center justify-center text-white text-2xl font-bold mb-3 shadow-lg', avatarColor(selectedChat.name))}>
                    {selectedChat.type === 'group' ? <Users className="w-7 h-7" /> : selectedChat.name?.charAt(0).toUpperCase()}
                  </div>
                  <p className="font-semibold text-slate-700 mb-1">{selectedChat.name}</p>
                  <p className="text-xs text-slate-400">{t('connect.typeMessage')}</p>
                </div>
              ) : (
                <div className="space-y-0.5">
                  <AnimatePresence initial={false}>
                    {currentMessages.map((msg) => {
                      const replyToMsg = msg.reply_to
                        ? currentMessages.find(m => m.id === msg.reply_to)
                        : null;
                      return (
                        <ChatBubble
                          key={msg.id}
                          message={msg}
                          isOwn={msg.sender_email === currentUser.email}
                          showSender={selectedChat.type === 'group'}
                          replyToMessage={replyToMsg}
                          onReact={reactToMessage}
                          onReply={(m) => setReplyTo(m)}
                          currentUser={currentUser}
                        />
                      );
                    })}
                  </AnimatePresence>
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Typing indicator */}
            <AnimatePresence>
              {(typingUsers[selectedChat.id] || []).length > 0 && (
                <TypingIndicator names={typingUsers[selectedChat.id]} />
              )}
            </AnimatePresence>

            {/* Chat-to-Action AI bar */}

            <div className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 p-2 sm:p-3">
              <MessageInput
                onSendMessage={sendMutation.mutate}
                disabled={sendMutation.isPending}
                conversationId={selectedChat.type === 'direct' ? selectedChat.id : null}
                groupChatId={selectedChat.type === 'group' ? selectedChat.id : null}
                replyTo={replyTo}
                onCancelReply={() => setReplyTo(null)}
                chat={selectedChat}
                currentUser={currentUser}
                onTyping={handleTyping}
              />
            </div>
          </>
        ) : (
          /* Empty state */
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-gradient-to-br from-blue-50/60 to-slate-50/40 dark:from-blue-950/20 dark:to-slate-950/10">
            <div className="w-24 h-24 rounded-full flex items-center justify-center mb-5 shadow-xl" style={{background:'linear-gradient(135deg, #1D6FB8, #29ABE2)'}}>
              <MessageCircle className="w-12 h-12 text-white" />
            </div>
            <h2 className="text-xl font-bold text-slate-700 dark:text-slate-200 mb-2">{t('connect.title')}</h2>
            <p className="text-slate-500 dark:text-slate-400 max-w-xs text-sm mb-6">
              {t('connect.exclusiveNote')}
            </p>
            <div className="flex gap-3">
              <Button className="bg-[#1D6FB8] hover:bg-[#2980B9]" onClick={() => setShowUserSearch(true)}>
                <MessageCircle className="w-4 h-4 mr-1.5" /> {t('connect.newMessage')}
              </Button>
              <Button variant="outline" onClick={() => setShowNewGroup(true)}>
                <Users className="w-4 h-4 mr-1.5" /> {t('connect.newGroup')}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* ── MODALS ───────────────────────────────────────────────────── */}

      {/* Profile Share Card */}
      <AnimatePresence>
        {showShareCard && currentUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowShareCard(false)}>
            <div onClick={e => e.stopPropagation()}>
              <ProfileShareCard user={currentUser} onClose={() => setShowShareCard(false)} />
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Invite by Email Modal */}
      <AnimatePresence>
        {showInviteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => setShowInviteModal(false)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.92 }}
              className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 p-6 w-80"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center gap-2 mb-1">
                <Mail className="w-4 h-4 text-teal-600" />
                <p className="font-bold text-slate-800 dark:text-slate-100">Invite to Vagus Connect</p>
              </div>
              <p className="text-xs text-slate-500 mb-4">They will receive a beautiful invite email with your name on it.</p>
              <input
                type="email"
                placeholder="friend@example.com"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendInvite()}
                className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm mb-3 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-teal-400"
                autoFocus
              />
              <div className="flex gap-2">
                <button onClick={() => setShowInviteModal(false)} className="flex-1 text-sm py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">Cancel</button>
                <Button onClick={sendInvite} disabled={inviteSending || !inviteEmail.trim()} className="flex-1 bg-[#1D6FB8] hover:bg-[#2980B9] h-10">
                  {inviteSending ? 'Sending...' : 'Send Invite'}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Profile card popup */}
      {profileAnchor && (
        <>
          <div className="fixed inset-0 z-50" onClick={() => setProfileAnchor(null)} />
          <div
            className="fixed z-50"
            style={{
              top: Math.min(profileAnchor.rect.bottom + 8, window.innerHeight - 320),
              left: Math.max(profileAnchor.rect.left - 120, 8),
            }}
          >
            <UserProfileCard user={profileAnchor.user} onClose={() => setProfileAnchor(null)} />
          </div>
        </>
      )}

      {showCall && (
        <DailyCallModal
          chat={selectedChat}
          currentUser={currentUser}
          initialMode={showCall}
          onClose={() => setShowCall(null)}
        />
      )}

      <UserSearchModal
        open={showUserSearch}
        onOpenChange={setShowUserSearch}
        currentUser={currentUser}
        onStartChat={(chat) => { setSelectedChat(chat); setShowUserSearch(false); }}
      />

      <NewGroupModal
        open={showNewGroup}
        onOpenChange={setShowNewGroup}
        currentUser={currentUser}
        onGroupCreated={(group) => setSelectedChat({
          id: group.id, type: 'group',
          name: group.name, members: group.members,
          lastMessage: '', lastMessageDate: group.created_date
        })}
      />
    </div>
  );
}