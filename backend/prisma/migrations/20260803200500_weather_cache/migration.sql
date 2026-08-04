-- CreateTable
CREATE TABLE "WeatherCache" (
    "citySlug" TEXT NOT NULL,
    "startDate" TEXT NOT NULL,
    "endDate" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "avgHighC" DOUBLE PRECISION NOT NULL,
    "avgLowC" DOUBLE PRECISION NOT NULL,
    "rainChancePercent" DOUBLE PRECISION NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WeatherCache_pkey" PRIMARY KEY ("citySlug","startDate","endDate","source")
);
