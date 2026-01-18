-- AlterTable
ALTER TABLE "users" ADD COLUMN     "connectionCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "isOnline" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lastHeartbeatAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "user_online_status" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "isOnline" BOOLEAN NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deviceInfo" TEXT,
    "ipAddress" TEXT,

    CONSTRAINT "user_online_status_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_online_status_userId_idx" ON "user_online_status"("userId");

-- CreateIndex
CREATE INDEX "user_online_status_timestamp_idx" ON "user_online_status"("timestamp");

-- CreateIndex
CREATE INDEX "users_isOnline_idx" ON "users"("isOnline");

-- CreateIndex
CREATE INDEX "users_lastSeenAt_idx" ON "users"("lastSeenAt");

-- AddForeignKey
ALTER TABLE "user_online_status" ADD CONSTRAINT "user_online_status_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
