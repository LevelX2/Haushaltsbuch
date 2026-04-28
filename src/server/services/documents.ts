import { z } from "zod";
import { eurosToCents } from "@/lib/money";
import { prisma } from "@/server/prisma";

const emptyToNull = z.preprocess((value) => (value === "" ? null : value), z.string().nullable().optional());
const optionalDate = emptyToNull.transform((value) => (value ? new Date(`${value}T00:00:00`) : null));
const optionalAmount = z.preprocess(
  (value) => (value === "" || value === null || value === undefined ? null : value),
  z.union([z.string(), z.number()]).nullable(),
).transform((value) => (value === null ? null : eurosToCents(value)));

const documentInput = z.object({
  filePath: z.string().trim().min(1),
  fileName: z.string().trim().min(1),
  fileHash: emptyToNull,
  documentType: z.string().default("UNKLAR"),
  documentGroup: z.string().default("SONDERBELEGE"),
  documentDate: optionalDate,
  providerId: emptyToNull,
  amount: optionalAmount,
  currency: z.string().default("EUR"),
  extractionJson: emptyToNull,
  importStatus: z.enum(["NEW", "IMPORTED", "NEEDS_REVIEW", "LINKED", "IGNORED", "DUPLICATE"]).default("NEW"),
  linkedCostPositionId: emptyToNull,
  linkedPaymentId: emptyToNull,
  notes: emptyToNull,
});

export async function listDocuments() {
  return prisma.document.findMany({
    include: { provider: true, linkedCostPosition: true, linkedPayment: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function createDocument(raw: unknown) {
  const input = documentInput.parse(raw);
  return prisma.document.create({
    data: {
      filePath: input.filePath,
      fileName: input.fileName,
      fileHash: input.fileHash,
      documentType: input.documentType,
      documentGroup: input.documentGroup,
      documentDate: input.documentDate,
      providerId: input.providerId,
      amountCents: input.amount,
      currency: input.currency,
      extractionJson: input.extractionJson,
      importStatus: input.importStatus,
      linkedCostPositionId: input.linkedCostPositionId,
      linkedPaymentId: input.linkedPaymentId,
      notes: input.notes,
    },
  });
}

export async function updateDocument(id: string, raw: unknown) {
  const input = documentInput.partial().parse(raw);
  return prisma.document.update({
    where: { id },
    data: {
      ...("filePath" in input ? { filePath: input.filePath } : {}),
      ...("fileName" in input ? { fileName: input.fileName } : {}),
      ...("fileHash" in input ? { fileHash: input.fileHash } : {}),
      ...("documentType" in input ? { documentType: input.documentType } : {}),
      ...("documentGroup" in input ? { documentGroup: input.documentGroup } : {}),
      ...("documentDate" in input ? { documentDate: input.documentDate } : {}),
      ...("providerId" in input ? { providerId: input.providerId } : {}),
      ...("amount" in input ? { amountCents: input.amount } : {}),
      ...("currency" in input ? { currency: input.currency } : {}),
      ...("extractionJson" in input ? { extractionJson: input.extractionJson } : {}),
      ...("importStatus" in input ? { importStatus: input.importStatus } : {}),
      ...("linkedCostPositionId" in input ? { linkedCostPositionId: input.linkedCostPositionId } : {}),
      ...("linkedPaymentId" in input ? { linkedPaymentId: input.linkedPaymentId } : {}),
      ...("notes" in input ? { notes: input.notes } : {}),
    },
  });
}
