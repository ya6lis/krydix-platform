-- CreateEnum
CREATE TYPE "ReleaseNoteStatus" AS ENUM ('DRAFT', 'PUBLISHED');

-- AlterEnum
ALTER TYPE "AuditAction" ADD VALUE 'RELEASE_NOTE_CHANGE';

-- CreateTable
CREATE TABLE "ReleaseNote" (
    "id" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "status" "ReleaseNoteStatus" NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReleaseNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReleaseNoteTranslation" (
    "id" TEXT NOT NULL,
    "releaseNoteId" TEXT NOT NULL,
    "language" "Language" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,

    CONSTRAINT "ReleaseNoteTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ReleaseNote_version_key" ON "ReleaseNote"("version");

-- CreateIndex
CREATE INDEX "ReleaseNote_status_idx" ON "ReleaseNote"("status");

-- CreateIndex
CREATE INDEX "ReleaseNote_publishedAt_idx" ON "ReleaseNote"("publishedAt");

-- CreateIndex
CREATE INDEX "ReleaseNote_createdAt_idx" ON "ReleaseNote"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ReleaseNoteTranslation_releaseNoteId_language_key" ON "ReleaseNoteTranslation"("releaseNoteId", "language");

-- AddForeignKey
ALTER TABLE "ReleaseNote" ADD CONSTRAINT "ReleaseNote_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReleaseNoteTranslation" ADD CONSTRAINT "ReleaseNoteTranslation_releaseNoteId_fkey" FOREIGN KEY ("releaseNoteId") REFERENCES "ReleaseNote"("id") ON DELETE CASCADE ON UPDATE CASCADE;
