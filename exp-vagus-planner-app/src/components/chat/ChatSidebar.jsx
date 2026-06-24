import React, { useState } from 'react';
import { Search, Plus, Users, User, MessageSquare, RefreshCw, Upload, Heart, Briefcase, Home as HomeIcon, UserCircle, Filter, Edit2, Clock } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { format, formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { SDK } from '@/lib/custom-sdk.js';

const RELATIONSHIP_CONFIG = {
  close_friend: { icon: Heart, label: 'Close Friend', color: 'text-pink-600 bg-pink-50' },
  friend: { icon: User, label: 'Friend', color: 'text-blue-600 bg-blue-50' },
  colleague: { icon: Briefcase, label: 'Colleague', color: 'text-purple-600 bg-purple-50' },
  family: { icon: HomeIcon, label: 'Family', color: 'text-green-600 bg-green-50' },
  acquaintance: { icon: UserCircle, label: 'Acquaintance', color: 'text-slate-600 bg-slate-50' }
};

export default function ChatSidebar({ 
  allChats, 
  contacts, 
  selectedChat, 
  onSelectChat, 
  onNewChat,
  onSyncGmail,
  onSyncPhone,
  syncingGmail,
  syncingPhone,
  currentUser
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [relationshipFilter, setRelationshipFilter] = useState('all');
  const [editingContact, setEditingContact] = useState(null);
  const [contactNotes, setContactNotes] = useState('');

  const filteredChats = allChats.filter(chat => 
    chat.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredContacts = contacts.filter(contact => {
    const matchesSearch = contact.friend_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.friend_email?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRelationship = relationshipFilter === 'all' || contact.relationship === relationshipFilter;
    return matchesSearch && matchesRelationship;
  });

  const handlePhoneSync = async () => {
    if (!window.navigator.contacts) {
      toast.info('Phone contact sync is available on Android Chrome and supported mobile browsers. Please use the app on your Android device to sync phone contacts.');
      return;
    }

    try {
      const props = ['name', 'email', 'tel'];
      const opts = { multiple: true };
      const contactsData = await window.navigator.contacts.select(props, opts);
      
      const formattedContacts = contactsData.map(c => ({
        name: c.name?.[0] || 'Unknown',
        email: c.email?.[0],
        phone: c.tel?.[0]
      })).filter(c => c.email);

      if (formattedContacts.length === 0) {
        toast.info('No contacts with email addresses were selected.');
        return;
      }

      await onSyncPhone(formattedContacts);
    } catch (error) {
      if (error.name !== 'AbortError') {
        toast.error('Could not access contacts. Please try again.');
      }
    }
  };

  const handleEditContact = (contact) => {
    setEditingContact(contact);
    setContactNotes(contact.notes || '');
  };

  const handleSaveContactDetails = async () => {
    if (!editingContact) return;
    try {
      await SDK.entities.SocialConnection.update(editingContact.id, { notes: contactNotes });
      toast.success('Contact updated');
      setEditingContact(null);
    } catch (error) {
      toast.error('Failed to update contact');
    }
  };

  const handleUpdateRelationship = async (contactId, relationship) => {
    try {
      await SDK.entities.SocialConnection.update(contactId, { relationship });
      toast.success('Relationship updated');
    } catch (error) {
      toast.error('Failed to update relationship');
    }
  };

  return (
    <div className="w-80 lg:w-96 bg-white border-r flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b bg-gradient-to-r from-teal-50 to-emerald-50">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-slate-800">Messages</h1>
            <p className="text-xs text-slate-500">
              {allChats.length} conversation{allChats.length !== 1 ? 's' : ''}
            </p>
          </div>
          <Button 
            onClick={onNewChat}
            size="icon" 
            className="h-10 w-10 rounded-full bg-teal-600 hover:bg-teal-700 shadow-lg"
          >
            <Plus className="w-5 h-5" />
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search messages or contacts..."
            className="pl-10 bg-white border-slate-200 h-10"
          />
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <div className="border-b px-4 bg-slate-50">
          <TabsList className="w-full bg-transparent grid grid-cols-2 h-12">
            <TabsTrigger value="all" className="data-[state=active]:bg-white">
              <MessageSquare className="w-4 h-4 mr-2" />
              Chats
            </TabsTrigger>
            <TabsTrigger value="contacts" className="data-[state=active]:bg-white">
              <User className="w-4 h-4 mr-2" />
              Contacts
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="all" className="flex-1 overflow-y-auto m-0 p-2">
          {filteredChats.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 p-8">
              <MessageSquare className="w-16 h-16 mb-4" />
              <p className="text-center text-sm">
                {searchQuery ? 'No chats found' : 'No conversations yet'}
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {filteredChats.map((chat) => (
                <button
                  key={chat.id}
                  onClick={() => onSelectChat(chat)}
                  className={cn(
                    "w-full p-3 rounded-lg transition-all text-left",
                    selectedChat?.id === chat.id 
                      ? 'bg-teal-50 border border-teal-200' 
                      : 'hover:bg-slate-50'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0",
                      chat.type === 'group' 
                        ? 'bg-gradient-to-br from-indigo-400 to-purple-500' 
                        : 'bg-gradient-to-br from-teal-400 to-emerald-500'
                    )}>
                      {chat.type === 'group' ? (
                        <Users className="w-6 h-6 text-white" />
                      ) : (
                        <span className="text-white font-semibold text-lg">
                          {chat.name?.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <h3 className="font-semibold text-slate-800 truncate">
                          {chat.name}
                        </h3>
                        {chat.lastMessageDate && (
                          <span className="text-xs text-slate-400">
                            {format(new Date(chat.lastMessageDate), 'HH:mm')}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-slate-500 truncate flex-1">
                          {chat.lastMessage || 'No messages yet'}
                        </p>
                        {chat.unreadCount > 0 && (
                          <Badge className="ml-2 bg-teal-600 text-white px-2 h-5 text-xs">
                            {chat.unreadCount}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="contacts" className="flex-1 overflow-y-auto m-0 p-3">
          <div className="mb-3 flex items-center gap-2">
            <Button
              onClick={onSyncGmail}
              disabled={syncingGmail}
              size="sm"
              variant="outline"
              className="flex-1 h-9"
            >
              {syncingGmail ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-2" />
              )}
              Gmail
            </Button>
            <Button
              onClick={handlePhoneSync}
              disabled={syncingPhone}
              size="sm"
              variant="outline"
              className="flex-1 h-9"
            >
              {syncingPhone ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Upload className="w-4 h-4 mr-2" />
              )}
              Phone
            </Button>
          </div>

          {/* Relationship Filter */}
          <div className="mb-3">
            <Select value={relationshipFilter} onValueChange={setRelationshipFilter}>
              <SelectTrigger className="h-9">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Filter by relationship" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Contacts</SelectItem>
                {Object.entries(RELATIONSHIP_CONFIG).map(([key, config]) => {
                  const Icon = config.icon;
                  return (
                    <SelectItem key={key} value={key}>
                      <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4" />
                        {config.label}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {filteredContacts.length === 0 ? (
            <div className="text-center py-12 px-4">
              <User className="w-16 h-16 text-slate-300 mx-auto mb-3" />
              <p className="text-sm text-slate-600 mb-3">No contacts yet</p>
              <p className="text-xs text-slate-500">Sync from Gmail or phone</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredContacts.map(contact => {
                const relationship = contact.relationship || 'friend';
                const config = RELATIONSHIP_CONFIG[relationship];
                const RelIcon = config.icon;
                
                return (
                  <div
                    key={contact.id}
                    className="p-3 rounded-lg border border-slate-200 hover:border-teal-300 transition-all bg-white"
                  >
                    <div className="flex items-start gap-3">
                      <button
                        onClick={() => onSelectChat({
                          id: `contact_${contact.friend_email}`,
                          type: 'direct',
                          name: contact.friend_name,
                          email: contact.friend_email
                        })}
                        className="flex items-center gap-3 flex-1 min-w-0 text-left"
                      >
                        <div className="w-11 h-11 rounded-full bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center text-white font-semibold flex-shrink-0">
                          {contact.friend_name?.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-slate-800 truncate">
                            {contact.friend_name}
                          </p>
                          <p className="text-xs text-slate-500 truncate">
                            {contact.friend_email}
                          </p>
                        </div>
                      </button>
                      <Dialog open={editingContact?.id === contact.id} onOpenChange={(open) => !open && setEditingContact(null)}>
                        <DialogTrigger asChild>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 flex-shrink-0"
                            onClick={() => handleEditContact(contact)}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Contact Details</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4 pt-4">
                            <div>
                              <Label>Relationship</Label>
                              <Select
                                value={contact.relationship || 'friend'}
                                onValueChange={(value) => handleUpdateRelationship(contact.id, value)}
                              >
                                <SelectTrigger className="mt-1">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {Object.entries(RELATIONSHIP_CONFIG).map(([key, config]) => {
                                    const Icon = config.icon;
                                    return (
                                      <SelectItem key={key} value={key}>
                                        <div className="flex items-center gap-2">
                                          <Icon className="w-4 h-4" />
                                          {config.label}
                                        </div>
                                      </SelectItem>
                                    );
                                  })}
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label>Notes</Label>
                              <Textarea
                                value={contactNotes}
                                onChange={(e) => setContactNotes(e.target.value)}
                                placeholder="Add notes about this contact..."
                                className="mt-1"
                                rows={4}
                              />
                            </div>
                            <Button onClick={handleSaveContactDetails} className="w-full">
                              Save Changes
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                    
                    <div className="mt-2 flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className={cn("text-xs", config.color)}>
                        <RelIcon className="w-3 h-3 mr-1" />
                        {config.label}
                      </Badge>
                      {contact.last_interacted && (
                        <Badge variant="outline" className="text-xs text-slate-600">
                          <Clock className="w-3 h-3 mr-1" />
                          {formatDistanceToNow(new Date(contact.last_interacted), { addSuffix: true })}
                        </Badge>
                      )}
                    </div>
                    
                    {contact.notes && (
                      <p className="mt-2 text-xs text-slate-600 line-clamp-2 bg-slate-50 p-2 rounded">
                        {contact.notes}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}