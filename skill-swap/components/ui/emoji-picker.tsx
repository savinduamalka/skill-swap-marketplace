'use client';

import { useState, useRef, useEffect } from 'react';
import { Smile } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useTheme } from 'next-themes';

interface EmojiPickerProps {
  onEmojiSelect: (emoji: string) => void;
  disabled?: boolean;
}

// Lazy load emoji picker to reduce initial bundle size
export function EmojiPicker({ onEmojiSelect, disabled }: EmojiPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [Picker, setPicker] = useState<any>(null);
  const [data, setData] = useState<any>(null);
  const { resolvedTheme } = useTheme();

  // Lazy load emoji-mart when popover opens
  useEffect(() => {
    if (isOpen && !Picker) {
      Promise.all([
        import('@emoji-mart/react'),
        import('@emoji-mart/data'),
      ]).then(([pickerModule, dataModule]) => {
        setPicker(() => pickerModule.default);
        setData(dataModule.default);
      });
    }
  }, [isOpen, Picker]);

  const handleEmojiSelect = (emoji: any) => {
    onEmojiSelect(emoji.native);
    setIsOpen(false);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          size="icon"
          variant="ghost"
          type="button"
          disabled={disabled}
          title="Add emoji"
          className="shrink-0"
        >
          <Smile className="w-5 h-5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-full p-0 border-none shadow-xl"
        side="top"
        align="end"
        sideOffset={10}
      >
        {Picker && data ? (
          <Picker
            data={data}
            onEmojiSelect={handleEmojiSelect}
            theme={resolvedTheme === 'dark' ? 'dark' : 'light'}
            previewPosition="none"
            skinTonePosition="search"
            maxFrequentRows={2}
            perLine={8}
            emojiSize={24}
            emojiButtonSize={32}
            navPosition="bottom"
            categories={[
              'frequent',
              'people',
              'nature',
              'foods',
              'activity',
              'places',
              'objects',
              'symbols',
              'flags',
            ]}
          />
        ) : (
          <div className="p-8 flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent" />
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
