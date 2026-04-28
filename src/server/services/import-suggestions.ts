import { z } from "zod";
import { prisma } from "@/server/prisma";

const emptyToNull = z.preprocess((value) => (value === "" ? null : value), z.string().nullable().optional());

const suggestionInput = z.object({
  sourceDocumentId: emptyToNull,
  suggestionType: z.string().trim().min(1),
  suggestedAction: z.string().trim().min(1),
  extractedJson: z.string().default("{}"),
  confidence: z.coerce.number().min(0).max(1).default(0),
  status: z.enum(["OPEN", "ACCEPTED", "REJECTED", "POSTPONED", "DUPLICATE", "EDITED"]).default("OPEN"),
  linkedCostPositionId: emptyToNull,
  linkedPaymentId: emptyToNull,
  notes: emptyToNull,
});

export async function listImportSuggestions() {
  return prisma.importSuggestion.findMany({
    include: { sourceDocument: true, linkedCostPosition: true, linkedPayment: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function createImportSuggestion(raw: unknown) {
  const input = suggestionInput.parse(raw);
  return prisma.importSuggestion.create({ data: input });
}

export async function updateImportSuggestion(id: string, raw: unknown) {
  const input = suggestionInput.partial().parse(raw);
  return prisma.importSuggestion.update({ where: { id }, data: input });
}
