-- CreateTable
CREATE TABLE "public"."users" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."songs" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "artist" TEXT NOT NULL,
    "album" TEXT,
    "duration" DOUBLE PRECISION,
    "filePath" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "songs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."fingerprints" (
    "id" SERIAL NOT NULL,
    "songId" INTEGER NOT NULL,
    "hashValue" BIGINT NOT NULL,
    "timeOffset" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fingerprints_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."user_queries" (
    "id" SERIAL NOT NULL,
    "audioDuration" DOUBLE PRECISION,
    "identifiedSongId" INTEGER,
    "confidenceScore" DOUBLE PRECISION,
    "processingTime" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_queries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "public"."users"("email");

-- CreateIndex
CREATE INDEX "songs_artist_title_idx" ON "public"."songs"("artist", "title");

-- CreateIndex
CREATE INDEX "fingerprints_hashValue_idx" ON "public"."fingerprints"("hashValue");

-- CreateIndex
CREATE INDEX "fingerprints_songId_timeOffset_idx" ON "public"."fingerprints"("songId", "timeOffset");

-- AddForeignKey
ALTER TABLE "public"."fingerprints" ADD CONSTRAINT "fingerprints_songId_fkey" FOREIGN KEY ("songId") REFERENCES "public"."songs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_queries" ADD CONSTRAINT "user_queries_identifiedSongId_fkey" FOREIGN KEY ("identifiedSongId") REFERENCES "public"."songs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
