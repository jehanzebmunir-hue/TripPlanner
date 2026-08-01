import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const ITEMS = [
  { phase: "weeks_out", order: 1, label: "Check ID is valid for travel dates" },
  { phase: "weeks_out", order: 2, label: "Notify your bank of travel dates" },
  { phase: "weeks_out", order: 3, label: "Pack chargers, adapter & a portable battery" },
  { phase: "weeks_out", order: 4, label: "Download an offline subway map" },
  { phase: "day_of", order: 1, label: "Check in for your flight & save boarding pass" },
  { phase: "day_of", order: 2, label: "Save this itinerary for offline access" },
  { phase: "day_of", order: 3, label: "Handle perishables & take out the trash" },
  { phase: "day_of", order: 4, label: "Lock up & adjust the thermostat" },
];

async function main() {
  await prisma.checklistTemplateItem.deleteMany();
  await prisma.checklistTemplateItem.createMany({ data: ITEMS });
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (err) => {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });
