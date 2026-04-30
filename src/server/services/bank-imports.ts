import fs from "node:fs/promises";
import path from "node:path";
import JSZip from "jszip";
import { z } from "zod";
import { normalizeName } from "@/lib/format";
import { prisma } from "@/server/prisma";

const camtDirectoryImportInput = z.object({
  directoryPath: z.string().min(3),
});

type CamtTransaction = {
  amountCents: number;
  currency: string;
  creditDebit: string;
  bookingDate: Date;
  valueDate: Date | null;
  reference: string;
  counterpartyName: string | null;
  remittance: string | null;
  additionalInfo: string | null;
  archiveName: string;
  xmlName: string;
  entryIndex: number;
};

export async function importCamtDirectory(raw: unknown) {
  const input = camtDirectoryImportInput.parse(raw);
  const entries = await fs.readdir(input.directoryPath, { withFileTypes: true });
  const archives = entries
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".zip"))
    .map((entry) => path.join(input.directoryPath, entry.name))
    .sort((left, right) => left.localeCompare(right));

  let parsed = 0;
  let created = 0;
  let updated = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const archivePath of archives) {
    try {
      const archiveName = path.basename(archivePath);
      const sourceDocument = await ensureSourceDocument(archivePath, archiveName);
      const zip = await JSZip.loadAsync(await fs.readFile(archivePath));
      const xmlFiles = Object.values(zip.files)
        .filter((file) => !file.dir && file.name.toLowerCase().endsWith(".xml"))
        .sort((left, right) => left.name.localeCompare(right.name));

      for (const file of xmlFiles) {
        const xml = await file.async("string");
        const transactions = parseCamtXml(xml, archiveName, file.name);
        parsed += transactions.length;
        for (const transaction of transactions) {
          const bankAccountRef = transaction.reference || `${archiveName}:${file.name}:${transaction.entryIndex}`;
          const duplicate = await prisma.payment.findFirst({ where: { bankAccountRef } });
          if (duplicate) {
            const paymentType = classifyPaymentType(transaction);
            if (duplicate.amountCents !== transaction.amountCents || duplicate.paymentType !== paymentType) {
              const provider = transaction.counterpartyName ? await ensureProvider(transaction.counterpartyName) : null;
              await prisma.payment.update({
                where: { id: duplicate.id },
                data: {
                  providerId: provider?.id ?? null,
                  date: transaction.bookingDate,
                  amountCents: transaction.amountCents,
                  currency: transaction.currency,
                  paymentType,
                  description: buildDescription(transaction),
                  sourceDocumentId: sourceDocument.id,
                  status: "BOOKED",
                },
              });
              updated += 1;
              continue;
            }
            skipped += 1;
            continue;
          }
          const provider = transaction.counterpartyName ? await ensureProvider(transaction.counterpartyName) : null;
          await prisma.payment.create({
            data: {
              providerId: provider?.id ?? null,
              date: transaction.bookingDate,
              amountCents: transaction.amountCents,
              currency: transaction.currency,
              paymentType: classifyPaymentType(transaction),
              description: buildDescription(transaction),
              bankAccountRef,
              sourceDocumentId: sourceDocument.id,
              status: "BOOKED",
            },
          });
          created += 1;
        }
      }
    } catch (error) {
      errors.push(`${path.basename(archivePath)}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  return {
    archives: archives.length,
    parsed,
    created,
    updated,
    skipped,
    errors,
  };
}

function parseCamtXml(xml: string, archiveName: string, xmlName: string): CamtTransaction[] {
  const transactions: CamtTransaction[] = [];
  for (const [entryIndex, entry] of matchAllBlocks(xml, "Ntry").entries()) {
    const amount = tagText(entry, "Amt");
    const creditDebit = tagText(entry, "CdtDbtInd") ?? "DBIT";
    const bookingDate = parseIsoDate(tagText(firstBlock(entry, "BookgDt") ?? "", "Dt"));
    if (!amount || !bookingDate) {
      continue;
    }
    const txDetails = matchAllBlocks(entry, "TxDtls");
    const base = {
      amountCents: camtAmountToCents(amount),
      currency: tagAttribute(entry, "Amt", "Ccy") ?? "EUR",
      creditDebit,
      bookingDate,
      valueDate: parseIsoDate(tagText(firstBlock(entry, "ValDt") ?? "", "Dt")),
      reference: tagText(entry, "AcctSvcrRef") ?? "",
      additionalInfo: tagText(entry, "AddtlNtryInf"),
      archiveName,
      xmlName,
      entryIndex,
    };

    if (!txDetails.length) {
      transactions.push({ ...base, counterpartyName: null, remittance: null });
      continue;
    }

    for (const [txIndex, tx] of txDetails.entries()) {
      const reference = tagText(tx, "EndToEndId") ?? tagText(tx, "Ref") ?? base.reference;
      transactions.push({
        ...base,
        reference: reference ? `${reference}:${entryIndex}:${txIndex}` : `${archiveName}:${xmlName}:${entryIndex}:${txIndex}`,
        counterpartyName: counterpartyName(tx, creditDebit),
        remittance: tagTexts(tx, "Ustrd").join(" "),
        entryIndex: entryIndex * 1000 + txIndex,
      });
    }
  }
  return transactions;
}

function matchAllBlocks(xml: string, tagName: string) {
  const pattern = new RegExp(`<(?:\\w+:)?${tagName}\\b[^>]*>[\\s\\S]*?<\\/(?:\\w+:)?${tagName}>`, "g");
  return xml.match(pattern) ?? [];
}

function firstBlock(xml: string, tagName: string) {
  return matchAllBlocks(xml, tagName)[0] ?? null;
}

function tagText(xml: string, tagName: string) {
  return tagTexts(xml, tagName)[0] ?? null;
}

function tagTexts(xml: string, tagName: string) {
  const pattern = new RegExp(`<(?:\\w+:)?${tagName}\\b[^>]*>([\\s\\S]*?)<\\/(?:\\w+:)?${tagName}>`, "g");
  return [...xml.matchAll(pattern)].map((match) => decodeXml(match[1].replace(/<[^>]+>/g, "").trim())).filter(Boolean);
}

function tagAttribute(xml: string, tagName: string, attribute: string) {
  const pattern = new RegExp(`<(?:\\w+:)?${tagName}\\b[^>]*\\s${attribute}="([^"]+)"`, "i");
  return xml.match(pattern)?.[1] ?? null;
}

function counterpartyName(tx: string, creditDebit: string) {
  const partyTag = creditDebit === "CRDT" ? "Dbtr" : "Cdtr";
  const party = firstBlock(tx, partyTag);
  return party ? tagText(party, "Nm") : tagText(tx, "Nm");
}

function parseIsoDate(value: string | null) {
  if (!value) {
    return null;
  }
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function classifyPaymentType(transaction: CamtTransaction) {
  const text = [transaction.counterpartyName, transaction.remittance, transaction.additionalInfo].join(" ");
  if (/bargeldauszahlung|geldautomat|\bga\s*nr/i.test(text)) {
    return "CASH_WITHDRAWAL";
  }
  if (/umbuchung|aktiondepot|depot|verrechnungskonto|tagesgeld|wertpapier|sparplan|eigene konten/i.test(text)) {
    return "TRANSFER";
  }
  if (transaction.creditDebit === "CRDT") {
    return /erstattung|gutschrift|refund/i.test(text) ? "REFUND" : "INCOME";
  }
  return "NORMAL";
}

function camtAmountToCents(value: string) {
  const parsed = Number.parseFloat(value.trim());
  return Number.isFinite(parsed) ? Math.round(parsed * 100) : 0;
}

function buildDescription(transaction: CamtTransaction) {
  return [transaction.counterpartyName, transaction.remittance, transaction.additionalInfo]
    .filter(Boolean)
    .join(" | ")
    .slice(0, 1000);
}

async function ensureProvider(name: string) {
  const normalizedName = normalizeName(name).slice(0, 180);
  return prisma.provider.upsert({
    where: { normalizedName },
    update: {},
    create: { name: name.slice(0, 220), normalizedName },
  });
}

async function ensureSourceDocument(filePath: string, fileName: string) {
  const existing = await prisma.document.findFirst({ where: { filePath } });
  if (existing) {
    return existing;
  }
  return prisma.document.create({
    data: {
      filePath,
      fileName,
      documentType: "KONTOAUSZUG",
      documentGroup: "KONTO_UND_ZAHLUNGSDATEN",
      importStatus: "IMPORTED",
      notes: "CAMT-ZIP-Import aus lokalem Bankordner.",
    },
  });
}

function decodeXml(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}
