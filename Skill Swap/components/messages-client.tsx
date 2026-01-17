/**
 * Messages Client Component
 *
 * Real-time messaging interface for skill exchange conversations.
 * Displays conversation list with online indicators and provides
 * a chat window with message history and input.
 *
 * @fileoverview Client-side messaging UI with conversation management
 */
'use client';

import { useState } from 'react';
import { Header } from '@/components/layout/header';
import { MobileNav } from '@/components/layout/mobile-nav';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Send, Search, Phone, MoreVertical } from 'lucide-react';

/**
 * User's active conversations with learning partners
 * In production, this would be fetched from a real-time messaging API
 */
const USER_CONVERSATIONS = [
  {
    id: 'conv-ava',
    user: 'Ava Martinez',
    avatar: 'AM',
    lastMessage: "Great! I'll send you the Figma files tomorrow.",
    timestamp: '2 hours ago',
    unread: 0,
    online: true,
  },
  {
    id: 'conv-raj',
    user: 'Raj Krishnan',
    avatar: 'RK',
    lastMessage: 'Thanks for the help with decorators!',
    timestamp: '1 day ago',
    unread: 2,
    online: true,
  },
  {
    id: 'conv-sophie',
    user: 'Sophie Laurent',
    avatar: 'SL',
    lastMessage: 'See you next week for the guitar session',
    timestamp: '3 days ago',
    unread: 0,
    online: false,
  },
  {
    id: 'conv-derek',
    user: 'Derek Chang',
    avatar: 'DC',
    lastMessage: "Let's schedule our first marketing call",
    timestamp: '5 days ago',
    unread: 1,
    online: false,
  },
];

/**
 * Message history for the selected conversation
 * In production, this would be paginated and loaded on demand
 */
const CONVERSATION_MESSAGES = [
  {
    id: 'msg-1',
    from: 'Ava',
    content: 'Hey! How was your design project going?',
    timestamp: '10:30 AM',
    isOwn: false,
  },
  {
    id: 'msg-2',
    from: 'You',
    content:
      'It went great! I applied all the prototyping techniques you taught me.',
    timestamp: '10:35 AM',
    isOwn: true,
  },
  {
    id: 'msg-3',
    from: 'Ava',
    content: "That's amazing! I'm so glad I could help 😊",
    timestamp: '10:40 AM',
    isOwn: false,
  },
  {
    id: 'msg-4',
    from: 'Ava',
    content: "Great! I'll send you the Figma files tomorrow.",
    timestamp: '2 hours ago',
    isOwn: false,
  },
];

export function MessagesClient() {
  const [selectedConversation, setSelectedConversation] = useState(
    USER_CONVERSATIONS[0]
  );
  const [messageInput, setMessageInput] = useState('');

  /**
   * Handle selecting a conversation from the list
   */
  const handleSelectConversation = (
    conversation: (typeof USER_CONVERSATIONS)[0]
  ) => {
    setSelectedConversation(conversation);
  };

  /**
   * Handle message input change
   */
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessageInput(e.target.value);
  };

  return (
    <>
      <Header />

      <main className="pb-20 md:pb-0">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 h-[calc(100vh-200px)] flex flex-col md:flex-row gap-6">
          {/* Conversation List Sidebar */}
          <div className="hidden md:flex flex-col w-80 border-r border-border">
            {/* Search Conversations */}
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search conversations..."
                  className="pl-10"
                />
              </div>
            </div>

            {/* Conversation Items */}
            <div className="flex-1 overflow-y-auto space-y-2">
              {USER_CONVERSATIONS.map((conv) => (
                <Card
                  key={conv.id}
                  className={`p-4 cursor-pointer hover:bg-muted transition ${
                    selectedConversation.id === conv.id
                      ? 'bg-primary/10 border-primary'
                      : ''
                  }`}
                  onClick={() => handleSelectConversation(conv)}
                >
                  <div className="flex items-start gap-3">
                    {/* Avatar with Online Indicator */}
                    <div className="relative w-12 h-12 flex-shrink-0">
                      <div className="w-12 h-12 bg-gradient-to-br from-primary to-secondary rounded-lg flex items-center justify-center">
                        <span className="text-sm font-bold text-primary-foreground">
                          {conv.avatar}
                        </span>
                      </div>
                      {conv.online && (
                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
                      )}
                    </div>

                    {/* Conversation Preview */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-semibold text-foreground">
                          {conv.user}
                        </p>
                        {conv.unread > 0 && (
                          <Badge variant="destructive">{conv.unread}</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {conv.lastMessage}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {conv.timestamp}
                      </p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* Chat Window */}
          <div className="flex-1 flex flex-col md:border-l md:border-border">
            {/* Chat Header */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-primary to-secondary rounded-lg flex items-center justify-center">
                  <span className="text-sm font-bold text-primary-foreground">
                    {selectedConversation.avatar}
                  </span>
                </div>
                <div>
                  <p className="font-semibold text-foreground">
                    {selectedConversation.user}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {selectedConversation.online ? 'Online' : 'Offline'}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="icon" variant="ghost" title="Start call">
                  <Phone className="w-4 h-4" />
                </Button>
                <Button size="icon" variant="ghost" title="More options">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Message History */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {CONVERSATION_MESSAGES.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${
                    msg.isOwn ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div
                    className={`max-w-xs px-4 py-2 rounded-lg ${
                      msg.isOwn
                        ? 'bg-primary text-primary-foreground rounded-br-none'
                        : 'bg-muted text-foreground rounded-bl-none'
                    }`}
                  >
                    <p className="text-sm">{msg.content}</p>
                    <p
                      className={`text-xs mt-1 ${
                        msg.isOwn ? 'opacity-75' : 'text-muted-foreground'
                      }`}
                    >
                      {msg.timestamp}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Message Input */}
            <div className="p-4 border-t border-border flex gap-2">
              <Input
                placeholder="Type a message..."
                value={messageInput}
                onChange={handleInputChange}
              />
              <Button size="icon" title="Send message">
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </main>

      <MobileNav />
    </>
  );
}
