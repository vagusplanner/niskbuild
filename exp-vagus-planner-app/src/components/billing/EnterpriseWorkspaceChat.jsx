/**
 * EnterpriseWorkspaceChat
 * Private encrypted team chat — Enterprise Standard plan only.
 */
import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SDK } from '@/lib/custom-sdk.js';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Lock, Send, Users, Hash, Plus, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';

export default function EnterpriseWorkspaceChat() {
  const queryClient = useQueryClient();
  const [selectedChat, setSelectedChat] = useState(null);
  const [message, setMessage] = useState('');
  const [newGroupName, setNewGroupName] = useState('');
  const [showNewGroup, setShowNewGroup] = useState(false);
  const messagesEndRef = useRef(null);

  const { data: user } = useQuery({ queryKey: ['me'], queryFn: () => SDK.auth.me() });

  const { data: groups = [] } = useQuery({
    queryKey: ['workspaceChats'],
    queryFn: () => SDK.entities.GroupChat.filter({ context_type: 'general' }),
    refetchInterval: 5000
  });

  const { data: messages = [] } = useQuery({
    queryKey: ['workspaceMessages', selectedChat?.id],
    queryFn: () => selectedChat
      ? SDK.entities.GroupMessage.filter({ group_chat_id: selectedChat.id }, '-created_date', 50)
      : [],
    enabled: !!selectedChat,
    refetchInterval: 3000
  });

  const sortedMessages = [...messages].reverse();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const createGroupMutation = useMutation({
    mutationFn: () => SDK.entities.GroupChat.create({
      name: newGroupName,
      context_type: 'general',
      members: [user?.email],
      created_by: user?.email
    }),
    onSuccess: (group) => {
      queryClient.invalidateQueries({ queryKey: ['workspaceChats'] });
      setSelectedChat(group);
      setNewGroupName('');
      setShowNewGroup(false);
    }
  });

  const sendMessageMutation = useMutation({
    mutationFn: () => SDK.entities.GroupMessage.create({
      group_chat_id: selectedChat.id,
      message,
      sender_email: user?.email,
      sender_name: user?.full_name || user?.email,
      message_type: 'text'
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspaceMessages', selectedChat.id] });
      setMessage('');
    }
  });

  const handleSend = (e) => {
    e.preventDefault();
    if (!message.trim() || !selectedChat) return;
    sendMessageMutation.mutate();
  };

  return (
    <div className="flex h-[600px] rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden bg-white dark:bg-slate-900">
      {/* Sidebar */}
      <div className="w-64 border-r border-slate-200 dark:border-slate-700 flex flex-col bg-slate-50 dark:bg-slate-800/50">
        <div className="p-4 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2 mb-3">
            <Lock className="w-4 h-4 text-purple-600" />
            <span className="font-bold text-sm text-slate-800 dark:text-slate-200">Workspace Chat</span>
            <Badge className="ml-auto bg-purple-100 text-purple-700 text-xs border-0">Enterprise</Badge>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="w-full text-xs gap-1"
            onClick={() => setShowNewGroup(true)}
          >
            <Plus className="w-3 h-3" /> New Channel
          </Button>
        </div>

        {showNewGroup && (
          <div className="p-3 border-b border-slate-200 dark:border-slate-700 space-y-2">
            <Input
              placeholder="Channel name..."
              value={newGroupName}
              onChange={e => setNewGroupName(e.target.value)}
              className="text-xs h-8"
              onKeyDown={e => e.key === 'Enter' && newGroupName.trim() && createGroupMutation.mutate()}
            />
            <div className="flex gap-1">
              <Button size="sm" className="flex-1 text-xs h-7" onClick={() => createGroupMutation.mutate()} disabled={!newGroupName.trim()}>Create</Button>
              <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => setShowNewGroup(false)}>Cancel</Button>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {groups.length === 0 && (
            <p className="text-xs text-slate-400 text-center mt-8 px-3">Create your first channel to start collaborating</p>
          )}
          {groups.map(group => (
            <button
              key={group.id}
              onClick={() => setSelectedChat(group)}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors text-sm ${
                selectedChat?.id === group.id
                  ? 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300'
                  : 'hover:bg-slate-100 dark:hover:bg-slate-700/50 text-slate-700 dark:text-slate-300'
              }`}
            >
              <Hash className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="truncate font-medium">{group.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Chat */}
      <div className="flex-1 flex flex-col">
        {selectedChat ? (
          <>
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center gap-2">
              <Hash className="w-4 h-4 text-slate-500" />
              <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedChat.name}</span>
              <div className="ml-auto flex items-center gap-1 text-xs text-slate-400">
                <Users className="w-3.5 h-3.5" />
                <span>Team</span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {sortedMessages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-slate-400">
                  <MessageSquare className="w-10 h-10 mb-2 opacity-30" />
                  <p className="text-sm">No messages yet. Start the conversation!</p>
                </div>
              )}
              {sortedMessages.map(msg => {
                const isMe = msg.sender_email === user?.email;
                return (
                  <div key={msg.id} className={`flex gap-3 ${isMe ? 'flex-row-reverse' : ''}`}>
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-indigo-500 flex items-center justify-center flex-shrink-0 text-white text-xs font-bold">
                      {(msg.sender_name || msg.sender_email)?.[0]?.toUpperCase()}
                    </div>
                    <div className={`max-w-[70%] ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                          {isMe ? 'You' : (msg.sender_name || msg.sender_email)}
                        </span>
                        <span className="text-xs text-slate-400">
                          {format(new Date(msg.created_date), 'HH:mm')}
                        </span>
                      </div>
                      <div className={`px-3 py-2 rounded-2xl text-sm ${
                        isMe
                          ? 'bg-purple-600 text-white rounded-tr-sm'
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-tl-sm'
                      }`}>
                        {msg.message}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSend} className="p-4 border-t border-slate-200 dark:border-slate-700 flex gap-2">
              <Input
                placeholder={`Message #${selectedChat.name}...`}
                value={message}
                onChange={e => setMessage(e.target.value)}
                className="flex-1"
              />
              <Button type="submit" size="icon" disabled={!message.trim()} className="bg-purple-600 hover:bg-purple-700">
                <Send className="w-4 h-4" />
              </Button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 space-y-3">
            <div className="w-16 h-16 rounded-2xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
              <Lock className="w-8 h-8 text-purple-500" />
            </div>
            <p className="font-semibold text-slate-700 dark:text-slate-300">Private Workspace Chat</p>
            <p className="text-sm text-center max-w-xs">Select a channel or create one to start collaborating securely with your team.</p>
          </div>
        )}
      </div>
    </div>
  );
}