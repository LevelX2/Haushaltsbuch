import { z } from "zod";
import { normalizeName } from "@/lib/format";
import { prisma } from "@/server/prisma";

const textOrNull = z.preprocess((value) => (value === "" ? null : value), z.string().nullable().optional());

const providerInput = z.object({
  name: z.string().trim().min(1),
  aliases: z.array(z.string()).optional().default([]),
  notes: textOrNull,
});

const categoryInput = z.object({
  name: z.string().trim().min(1),
  parentCategoryId: textOrNull,
  active: z.boolean().default(true),
  sortOrder: z.coerce.number().int().default(100),
});

export async function listProviders() {
  return prisma.provider.findMany({ orderBy: { name: "asc" } });
}

export async function createProvider(raw: unknown) {
  const input = providerInput.parse(raw);
  const normalizedName = normalizeName(input.name);

  return prisma.provider.upsert({
    where: { normalizedName },
    update: {
      name: input.name,
      aliasesJson: JSON.stringify(input.aliases),
      notes: input.notes,
    },
    create: {
      name: input.name,
      normalizedName,
      aliasesJson: JSON.stringify(input.aliases),
      notes: input.notes,
    },
  });
}

export async function updateProvider(id: string, raw: unknown) {
  const input = providerInput.partial().parse(raw);
  const data = {
    ...("name" in input && input.name ? { name: input.name, normalizedName: normalizeName(input.name) } : {}),
    ...("aliases" in input ? { aliasesJson: JSON.stringify(input.aliases ?? []) } : {}),
    ...("notes" in input ? { notes: input.notes } : {}),
  };

  return prisma.provider.update({ where: { id }, data });
}

export async function listCategories() {
  return prisma.category.findMany({
    include: { parent: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
}

export async function createCategory(raw: unknown) {
  const input = categoryInput.parse(raw);
  return prisma.category.create({
    data: input,
  });
}

export async function updateCategory(id: string, raw: unknown) {
  const input = categoryInput.partial().parse(raw);
  return prisma.category.update({
    where: { id },
    data: input,
  });
}

export async function listHouseholdScopes() {
  return prisma.householdScope.findMany({
    where: { active: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
}
