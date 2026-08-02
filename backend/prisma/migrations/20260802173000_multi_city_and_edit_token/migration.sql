-- CreateTable
CREATE TABLE "TripLeg" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "TripLeg_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TripLeg_tripId_idx" ON "TripLeg"("tripId");

-- AddForeignKey
ALTER TABLE "TripLeg" ADD CONSTRAINT "TripLeg_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable: TripItem gets an optional legId
ALTER TABLE "TripItem" ADD COLUMN "legId" TEXT;

-- AddForeignKey
ALTER TABLE "TripItem" ADD CONSTRAINT "TripItem_legId_fkey" FOREIGN KEY ("legId") REFERENCES "TripLeg"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable: Trip gets editToken -- added nullable first since the table
-- is non-empty and a Prisma-level (not DB-level) default can't backfill
-- existing rows automatically.
ALTER TABLE "Trip" ADD COLUMN "editToken" TEXT;

-- Backfill existing rows with a real, unique value (not a placeholder --
-- gen_random_uuid() is a genuine Postgres-native unique identifier, just
-- not in cuid() format; the schema only requires String @unique, not a
-- specific format).
UPDATE "Trip" SET "editToken" = gen_random_uuid()::text WHERE "editToken" IS NULL;

-- Now safe to make it required
ALTER TABLE "Trip" ALTER COLUMN "editToken" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Trip_editToken_key" ON "Trip"("editToken");
