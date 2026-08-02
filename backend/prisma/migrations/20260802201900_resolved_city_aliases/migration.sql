-- AlterTable
ALTER TABLE "ResolvedCity" ADD COLUMN "aliases" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
