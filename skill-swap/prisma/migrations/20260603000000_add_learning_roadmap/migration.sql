-- CreateTable
CREATE TABLE "learning_roadmaps" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "skillWantId" TEXT,
    "skillName" TEXT NOT NULL,
    "skillDescription" TEXT,
    "proficiencyTarget" TEXT,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "estimatedDuration" TEXT,
    "content" JSONB NOT NULL,
    "completedSteps" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "learning_roadmaps_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "learning_roadmaps_userId_idx" ON "learning_roadmaps"("userId");

-- CreateIndex
CREATE INDEX "learning_roadmaps_skillName_idx" ON "learning_roadmaps"("skillName");

-- AddForeignKey
ALTER TABLE "learning_roadmaps" ADD CONSTRAINT "learning_roadmaps_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
