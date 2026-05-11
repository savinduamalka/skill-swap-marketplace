export type NotificationItem = {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  relatedUserId?: string | null;
  relatedEntityId?: string | null;
  relatedEntityType?: string | null;
  isSeen: boolean;
  isRead: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
};

export type NotificationSocketPayload = {
  notification: NotificationItem;
};
