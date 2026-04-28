import { PrismaClient } from "@prisma/client";
import { defaultSettings } from "../src/server/default-settings";
import { normalizeName } from "../src/lib/format";

const prisma = new PrismaClient();

const categories = [
  "Wohnen",
  "Energie",
  "Wasser / Abwasser",
  "Versicherungen",
  "Telekommunikation",
  "Mobilität / Auto",
  "Gesundheit",
  "Lebensmittel",
  "Haushalt",
  "Hund / Haustier",
  "Abos / Medien",
  "Bank / Finanzen",
  "Steuern / Gebühren",
  "Freizeit",
  "Kleidung",
  "Technik / Anschaffungen",
  "Handwerker / Instandhaltung",
  "Geschenke",
  "Einnahmen",
  "Sonstiges",
  "Unklar",
];

const householdScopes = [
  "gesamter Haushalt",
  "Ludwig",
  "Sabine",
  "Hund / Haustier",
  "Haus / Immobilie",
  "Auto",
  "sonstige Person",
  "sonstiger Zweck",
  "unklar",
];

async function main() {
  for (const [index, name] of categories.entries()) {
    const existing = await prisma.category.findFirst({
      where: { name, parentCategoryId: null },
    });
    if (existing) {
      await prisma.category.update({
        where: { id: existing.id },
        data: { active: true, sortOrder: index + 1 },
      });
    } else {
      await prisma.category.create({ data: { name, sortOrder: index + 1 } });
    }
  }

  for (const [index, name] of householdScopes.entries()) {
    await prisma.householdScope.upsert({
      where: { name },
      update: { active: true, sortOrder: index + 1 },
      create: { name, sortOrder: index + 1 },
    });
  }

  await prisma.provider.upsert({
    where: { normalizedName: normalizeName("Unbekannt") },
    update: {},
    create: {
      name: "Unbekannt",
      normalizedName: normalizeName("Unbekannt"),
      aliasesJson: JSON.stringify(["unklar", "unbekannt"]),
      notes: "Standardanbieter für unklare oder noch zu prüfende Eingaben.",
    },
  });

  for (const setting of defaultSettings()) {
    await prisma.appSetting.upsert({
      where: { key: setting.key },
      update: {
        label: setting.label,
      },
      create: setting,
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
