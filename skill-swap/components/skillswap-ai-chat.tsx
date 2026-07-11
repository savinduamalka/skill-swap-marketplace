'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Send, Sparkles, Loader2, ChevronLeft, Pin, PinOff, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { EmojiPicker } from '@/components/ui/emoji-picker';

interface AIMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

interface SkillSwapAIChatProps {
  onClose: () => void;
  isPinned: boolean;
  onTogglePin: () => void;
  onClearChat: () => void;
  initialMessages: AIMessage[];
}

export function SkillSwapAIChat({ onClose, isPinned, onTogglePin, onClearChat, initialMessages }: SkillSwapAIChatProps) {
  const [messages, setMessages] = useState<AIMessage[]>(initialMessages);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    setMessages(initialMessages);
  }, [initialMessages]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;

    const userInput = input.trim();
    setInput('');
    setIsLoading(true);

    const tempUserMsg: AIMessage = { id: `temp-${Date.now()}`, role: 'user', content: userInput, createdAt: new Date().toISOString() };
    setMessages((prev) => [...prev, tempUserMsg]);

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userInput }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessages((prev) => [
          ...prev.filter((m) => m.id !== tempUserMsg.id),
          data.userMessage,
          data.aiMessage,
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          { id: `err-${Date.now()}`, role: 'assistant', content: data.error || "Sorry, couldn't process that.", createdAt: new Date().toISOString() },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { id: `err-${Date.now()}`, role: 'assistant', content: "Connection issue. Try again.", createdAt: new Date().toISOString() },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = async () => {
    try {
      await fetch('/api/ai/chat', { method: 'DELETE' });
      setMessages([]);
      onClearChat();
      toast.success('Chat cleared');
    } catch {
      toast.error('Failed to clear chat');
    }
  };

  const renderContent = (content: string) => {
    return content.split('\n').map((line, i) => {
      let processed = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      if (processed.startsWith('- ')) {
        return <li key={i} className="ml-4 list-disc" dangerouslySetInnerHTML={{ __html: processed.slice(2) }} />;
      }
      if (processed.trim() === '') return <br key={i} />;
      return <p key={i} dangerouslySetInnerHTML={{ __html: processed }} />;
    });
  };

  return (
    <div className="flex-1 flex flex-col md:border-l md:border-border overflow-hidden">
      {/* Chat Header — same style as regular conversations */}
      <div className="flex items-center justify-between p-3 md:p-4 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="md:hidden h-8 w-8" onClick={onClose}>
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <Avatar className="w-9 h-9">
            <AvatarImage src="/skillswap-logo.png" alt="SkillSwap AI" />
            <AvatarFallback className="bg-primary text-primary-foreground text-xs">AI</AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-semibold text-sm flex items-center gap-1">
              SkillSwap AI
              <Sparkles className="w-3 h-3 text-primary" />
            </h3>
            <span className="text-xs text-green-500">Online</span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={handleClear} title="Clear chat" className="h-8 w-8 text-muted-foreground hover:text-destructive">
            <Trash2 className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onTogglePin} title={isPinned ? 'Unpin' : 'Pin to top'} className="h-8 w-8">
            {isPinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* Message History — same style as regular conversations */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
            <Avatar className="w-16 h-16 mb-4">
              <AvatarImage src="/skillswap-logo.png" alt="SkillSwap AI" />
              <AvatarFallback className="bg-primary text-primary-foreground"><Sparkles className="w-8 h-8" /></AvatarFallback>
            </Avatar>
            <p className="font-medium text-foreground mb-1">SkillSwap AI</p>
            <p className="text-sm max-w-xs">Ask me anything — platform help, study tips, career advice, or just chat.</p>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] ${msg.role === 'user' ? '' : 'flex gap-2'}`}>
              {msg.role === 'assistant' && (
                <Avatar className="w-7 h-7 shrink-0 mt-1">
                  <AvatarImage src="/skillswap-logo.png" alt="AI" />
                  <AvatarFallback className="bg-primary text-primary-foreground text-[10px]">AI</AvatarFallback>
                </Avatar>
              )}
              <div>
                <div className={`rounded-2xl px-3 py-2 text-sm ${
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted'
                }`}>
                  <div className="space-y-0.5 leading-relaxed">{renderContent(msg.content)}</div>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1 px-1">
                  {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}
                </p>
              </div>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="flex gap-2">
              <Avatar className="w-7 h-7 shrink-0 mt-1">
                <AvatarImage src="/skillswap-logo.png" alt="AI" />
                <AvatarFallback className="bg-primary text-primary-foreground text-[10px]">AI</AvatarFallback>
              </Avatar>
              <div className="bg-muted rounded-2xl px-4 py-3">
                <div className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 bg-muted-foreground/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-1.5 h-1.5 bg-muted-foreground/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-1.5 h-1.5 bg-muted-foreground/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} className="h-2 shrink-0" />
      </div>

      {/* Input Bar — same as regular conversations */}
      <div className="p-3 md:p-4 flex gap-2 items-center border-t border-border bg-background shrink-0">
        <EmojiPicker
          onEmojiSelect={(emoji) => {
            setInput((prev) => prev + emoji);
            inputRef.current?.focus();
          }}
          disabled={isLoading}
        />
        <Input
          ref={inputRef}
          placeholder="Type a message..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) handleSend(); }}
          disabled={isLoading}
        />
        <Button
          size="icon"
          onClick={() => handleSend()}
          disabled={!input.trim() || isLoading}
        >
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </Button>
      </div>
    </div>
  );
}
