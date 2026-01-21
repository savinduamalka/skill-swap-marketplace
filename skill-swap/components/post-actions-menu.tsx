'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Edit,
  Trash2,
  Bookmark,
  BookmarkCheck,
  MoreHorizontal,
} from 'lucide-react';

interface PostActionsMenuProps {
  postId: string;
  isAuthor: boolean;
  isSaved?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  onSaveToggle?: (isSaved: boolean) => void;
}

export function PostActionsMenu({
  postId,
  isAuthor,
  isSaved = false,
  onEdit,
  onDelete,
  onSaveToggle,
}: PostActionsMenuProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleSaveToggle = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/newsfeed/${postId}/save`, {
        method: 'POST',
      });

      if (response.ok) {
        const data = await response.json();
        onSaveToggle?.(!isSaved);
      }
    } catch (error) {
      console.error('Error toggling save:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {/* Save/Unsave option (for all users except author) */}
        {!isAuthor && (
          <>
            <DropdownMenuItem
              onClick={handleSaveToggle}
              disabled={isLoading}
              className="cursor-pointer gap-2"
            >
              {isSaved ? (
                <>
                  <BookmarkCheck className="w-4 h-4" />
                  <span>Unsave</span>
                </>
              ) : (
                <>
                  <Bookmark className="w-4 h-4" />
                  <span>Save Post</span>
                </>
              )}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}

        {/* Edit and Delete options (only for author) */}
        {isAuthor && (
          <>
            <DropdownMenuItem onClick={onEdit} className="cursor-pointer gap-2">
              <Edit className="w-4 h-4" />
              <span>Edit Post</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={onDelete}
              className="cursor-pointer gap-2 text-red-600 dark:text-red-400"
            >
              <Trash2 className="w-4 h-4" />
              <span>Delete Post</span>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
