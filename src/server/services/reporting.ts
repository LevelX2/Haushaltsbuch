import fsp from "node:fs/promises";
import path from "node:path";
import { addDays, startOfYear } from "date-fns";
import type { ConfidenceStatus } from "@prisma/client";
import JSZip from "jszip";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { formatDate, timestampForFile } from "@/lib/format";
import { formatMoney } from "@/lib/money";
import { prisma } from "@/server/prisma";
import { settingValue } from "@/server/services/settings";

type ReportRow = Record<string, string | number | null | undefined>;

type ReportDefinition = {
  type: string;
  title: string;
  rows: ReportRow[];
  columns: { key: string; header: string; width?: number }[];
};

const effectiveConfidence: ConfidenceStatus[] = ["SAFE", "ESTIMATED", "MANUALLY_CONFIRMED"];
const reportArchiveDirName = "Archiv";
const reportFileExtensions = new Set([".pdf", ".xlsx"]);

export async function listReportRuns() {
  return prisma.reportRun.findMany({ orderBy: { generatedAt: "desc" }, take: 100 });
}

export async function generateReports() {
  const reportsDir = await settingValue("reportsDir");
  await fsp.mkdir(reportsDir, { recursive: true });
  await archiveExistingReports(reportsDir);

  const definitions = await reportDefinitions();
  const generated = [];

  for (const definition of definitions) {
    const baseName = `${timestampForFile()}-${definition.type}`;
    const xlsxPath = path.join(reportsDir, `${baseName}.xlsx`);
    const pdfPath = path.join(reportsDir, `${baseName}.pdf`);

    await writeXlsx(xlsxPath, definition);
    await writePdf(pdfPath, definition);

    generated.push(
      await prisma.reportRun.create({
        data: {
          reportType: definition.type,
          filePath: xlsxPath,
          format: "XLSX",
          status: "SUCCESS",
        },
      }),
    );
    generated.push(
      await prisma.reportRun.create({
        data: {
          reportType: definition.type,
          filePath: pdfPath,
          format: "PDF",
          status: "SUCCESS",
        },
      }),
    );
  }

  return generated;
}

async function archiveExistingReports(reportsDir: string) {
  const archiveDir = path.join(reportsDir, reportArchiveDirName);
  await fsp.mkdir(archiveDir, { recursive: true });

  const entries = await fsp.readdir(reportsDir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isFile() || !reportFileExtensions.has(path.extname(entry.name).toLowerCase())) {
      continue;
    }

    const sourcePath = path.join(reportsDir, entry.name);
    const targetPath = await unusedArchivePath(archiveDir, entry.name);
    await fsp.rename(sourcePath, targetPath);
  }
}

async function unusedArchivePath(archiveDir: string, fileName: string) {
  const parsed = path.parse(fileName);
  let candidate = path.join(archiveDir, fileName);
  let suffix = 1;

  while (await pathExists(candidate)) {
    candidate = path.join(archiveDir, `${parsed.name}-${suffix}${parsed.ext}`);
    suffix += 1;
  }

  return candidate;
}

async function pathExists(filePath: string) {
  try {
    await fsp.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function reportDefinitions(): Promise<ReportDefinition[]> {
  const today = new Date();
  const in90Days = addDays(today, 90);
  const startYear = startOfYear(today);

  const fixedCosts = await prisma.costPosition.findMany({
    where: {
      status: "ACTIVE",
      recurrenceClass: "RECURRING",
      confidenceStatus: { in: effectiveConfidence },
    },
    include: { provider: true, category: true, householdScope: true },
    orderBy: { monthlyValueCents: "desc" },
  });

  const dueItems = await prisma.costPosition.findMany({
    where: { status: "ACTIVE", nextDueDate: { gte: today, lte: in90Days } },
    include: { provider: true, category: true },
    orderBy: { nextDueDate: "asc" },
  });

  const reviewItems = await prisma.costPosition.findMany({
    where: {
      status: { not: "ENDED" },
      OR: [{ recurrenceClass: "UNCLEAR" }, { confidenceStatus: "NEEDS_REVIEW" }],
    },
    include: { provider: true, category: true },
    orderBy: { updatedAt: "desc" },
  });

  const suggestions = await prisma.importSuggestion.findMany({
    where: { status: "OPEN" },
    include: { sourceDocument: true, linkedCostPosition: true },
    orderBy: { createdAt: "desc" },
  });

  const oneTimeCosts = await prisma.costPosition.findMany({
    where: { status: "ACTIVE", recurrenceClass: "ONE_TIME", createdAt: { gte: startYear } },
    include: { provider: true, category: true },
    orderBy: { createdAt: "desc" },
  });

  const categoryRows = Array.from(
    fixedCosts.reduce((map, item) => {
      const key = item.category?.name ?? "Unklar";
      const current = map.get(key) ?? { monthly: 0, yearly: 0, count: 0 };
      current.monthly += item.monthlyValueCents;
      current.yearly += item.yearlyValueCents;
      current.count += 1;
      map.set(key, current);
      return map;
    }, new Map<string, { monthly: number; yearly: number; count: number }>()),
  )
    .map(([category, value]) => ({
      Kategorie: category,
      Positionen: value.count,
      Monatswert: formatMoney(value.monthly),
      Jahreswert: formatMoney(value.yearly),
    }))
    .sort((a, b) => Number.parseFloat(b.Jahreswert) - Number.parseFloat(a.Jahreswert));

  const baseColumns = [
    { key: "Anbieter", header: "Anbieter", width: 24 },
    { key: "Bezeichnung", header: "Bezeichnung", width: 32 },
    { key: "Kategorie", header: "Kategorie", width: 22 },
    { key: "Betrag", header: "Betrag", width: 14 },
    { key: "Rhythmus", header: "Rhythmus", width: 18 },
    { key: "Monatswert", header: "Monatswert", width: 14 },
    { key: "Jahreswert", header: "Jahreswert", width: 14 },
    { key: "Nächste Fälligkeit", header: "Nächste Fälligkeit", width: 18 },
    { key: "Status", header: "Status", width: 18 },
  ];

  return [
    {
      type: "fixkosten-aktuell-vollreport",
      title: "Fixkostenübersicht aktuell",
      columns: baseColumns,
      rows: fixedCosts.map((item) => ({
        Anbieter: item.provider?.name ?? "",
        Bezeichnung: item.title,
        Kategorie: item.category?.name ?? "Unklar",
        Betrag: formatMoney(item.amountCents, item.currency),
        Rhythmus: item.recurrenceType,
        Monatswert: formatMoney(item.monthlyValueCents, item.currency),
        Jahreswert: formatMoney(item.yearlyValueCents, item.currency),
        "Nächste Fälligkeit": formatDate(item.nextDueDate),
        Status: item.confidenceStatus,
      })),
    },
    {
      type: "monatsbelastung-kategorien",
      title: "Monatsbelastung nach Kategorien",
      columns: [
        { key: "Kategorie", header: "Kategorie", width: 28 },
        { key: "Positionen", header: "Positionen", width: 12 },
        { key: "Monatswert", header: "Monatswert", width: 16 },
        { key: "Jahreswert", header: "Jahreswert", width: 16 },
      ],
      rows: categoryRows,
    },
    {
      type: "faelligkeiten-90-tage",
      title: "Fälligkeiten der nächsten 90 Tage",
      columns: baseColumns,
      rows: dueItems.map((item) => ({
        Anbieter: item.provider?.name ?? "",
        Bezeichnung: item.title,
        Kategorie: item.category?.name ?? "Unklar",
        Betrag: formatMoney(item.amountCents, item.currency),
        Rhythmus: item.recurrenceType,
        Monatswert: formatMoney(item.monthlyValueCents, item.currency),
        Jahreswert: formatMoney(item.yearlyValueCents, item.currency),
        "Nächste Fälligkeit": formatDate(item.nextDueDate),
        Status: item.confidenceStatus,
      })),
    },
    {
      type: "pruef-und-klaerungsliste",
      title: "Prüf- und Klärungsliste",
      columns: [
        { key: "Typ", header: "Typ", width: 18 },
        { key: "Bezeichnung", header: "Bezeichnung", width: 34 },
        { key: "Anbieter", header: "Anbieter", width: 24 },
        { key: "Status", header: "Status", width: 18 },
        { key: "Hinweis", header: "Hinweis", width: 42 },
      ],
      rows: [
        ...reviewItems.map((item) => ({
          Typ: "Kostenposition",
          Bezeichnung: item.title,
          Anbieter: item.provider?.name ?? "",
          Status: item.confidenceStatus,
          Hinweis: item.notes ?? "",
        })),
        ...suggestions.map((item) => ({
          Typ: "Prüfeingang",
          Bezeichnung: item.suggestionType,
          Anbieter: item.sourceDocument?.fileName ?? "",
          Status: item.status,
          Hinweis: item.notes ?? item.suggestedAction,
        })),
      ],
    },
    {
      type: "jahresuebersicht",
      title: "Jahresübersicht",
      columns: [
        { key: "Bereich", header: "Bereich", width: 28 },
        { key: "Anzahl", header: "Anzahl", width: 12 },
        { key: "Wert", header: "Wert", width: 18 },
      ],
      rows: [
        {
          Bereich: "Aktive Fixkosten jährlich",
          Anzahl: fixedCosts.length,
          Wert: formatMoney(fixedCosts.reduce((sum, item) => sum + item.yearlyValueCents, 0)),
        },
        {
          Bereich: "Einmalige Ausgaben im Jahr",
          Anzahl: oneTimeCosts.length,
          Wert: formatMoney(oneTimeCosts.reduce((sum, item) => sum + item.amountCents, 0)),
        },
        {
          Bereich: "Offene Prüfpunkte",
          Anzahl: suggestions.length + reviewItems.length,
          Wert: "",
        },
      ],
    },
  ];
}

async function writeXlsx(filePath: string, definition: ReportDefinition) {
  const zip = new JSZip();
  zip.file("[Content_Types].xml", contentTypesXml());
  zip.folder("_rels")?.file(".rels", rootRelationshipsXml());
  zip.folder("xl")?.file("workbook.xml", workbookXml(definition.title));
  zip.folder("xl")?.file("styles.xml", stylesXml());
  zip.folder("xl")?.folder("_rels")?.file("workbook.xml.rels", workbookRelationshipsXml());
  zip.folder("xl")?.folder("worksheets")?.file("sheet1.xml", worksheetXml(definition));
  const buffer = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
  await fsp.writeFile(filePath, buffer);
}

async function writePdf(filePath: string, definition: ReportDefinition) {
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const pageSize: [number, number] = [842, 595];
  const margin = 36;
  let page = pdf.addPage(pageSize);
  let y = pageSize[1] - margin;

  const addPage = () => {
    page = pdf.addPage(pageSize);
    y = pageSize[1] - margin;
  };

  page.drawText(sanitizePdfText(definition.title), {
    x: margin,
    y,
    size: 18,
    font: bold,
    color: rgb(0.07, 0.13, 0.12),
  });
  y -= 20;
  page.drawText(sanitizePdfText(`Erzeugt am ${formatDate(new Date())}`), {
    x: margin,
    y,
    size: 9,
    font: regular,
    color: rgb(0.35, 0.41, 0.39),
  });
  y -= 24;

  drawWrappedLine(definition.columns.map((column) => column.header).join(" | "), bold);
  y -= 6;
  page.drawLine({
    start: { x: margin, y },
    end: { x: pageSize[0] - margin, y },
    thickness: 1,
    color: rgb(0.75, 0.78, 0.77),
  });
  y -= 14;

  for (const row of definition.rows) {
    const line = definition.columns
      .map((column) => String(row[column.key] ?? "").replace(/\s+/g, " "))
      .join(" | ");
    drawWrappedLine(line, regular);
    y -= 5;

    if (y < margin + 24) {
      addPage();
    }
  }

  const bytes = await pdf.save();
  await fsp.writeFile(filePath, bytes);

  function drawWrappedLine(line: string, font: typeof regular) {
    const chunks = wrapLine(sanitizePdfText(line), 155);
    for (const chunk of chunks) {
      if (y < margin + 18) {
        addPage();
      }
      page.drawText(chunk, {
        x: margin,
        y,
        size: 8,
        font,
        color: rgb(0.08, 0.11, 0.1),
      });
      y -= 11;
    }
  }
}

function worksheetXml(definition: ReportDefinition) {
  const rows = [
    definition.columns.map((column) => column.header),
    ...definition.rows.map((row) => definition.columns.map((column) => row[column.key] ?? "")),
  ];

  const sheetData = rows
    .map((row, rowIndex) => {
      const cells = row
        .map((value, columnIndex) => {
          const cellRef = `${columnName(columnIndex + 1)}${rowIndex + 1}`;
          const style = rowIndex === 0 ? ' s="1"' : "";
          return `<c r="${cellRef}" t="inlineStr"${style}><is><t>${escapeXml(String(value))}</t></is></c>`;
        })
        .join("");
      return `<row r="${rowIndex + 1}">${cells}</row>`;
    })
    .join("");

  const cols = definition.columns
    .map((column, index) => {
      const width = column.width ?? 18;
      return `<col min="${index + 1}" max="${index + 1}" width="${width}" customWidth="1"/>`;
    })
    .join("");

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>
  <cols>${cols}</cols>
  <sheetData>${sheetData}</sheetData>
  <autoFilter ref="A1:${columnName(definition.columns.length)}${Math.max(1, rows.length)}"/>
</worksheet>`;
}

function contentTypesXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>`;
}

function rootRelationshipsXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;
}

function workbookXml(title: string) {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets><sheet name="${escapeXml(title.slice(0, 31))}" sheetId="1" r:id="rId1"/></sheets>
</workbook>`;
}

function workbookRelationshipsXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;
}

function stylesXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts>
  <fills count="1"><fill><patternFill patternType="none"/></fill></fills>
  <borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs>
</styleSheet>`;
}

function columnName(index: number) {
  let name = "";
  let cursor = index;
  while (cursor > 0) {
    const modulo = (cursor - 1) % 26;
    name = String.fromCharCode(65 + modulo) + name;
    cursor = Math.floor((cursor - modulo) / 26);
  }
  return name;
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function sanitizePdfText(value: string) {
  return value.replace(/[^\u0009\u000a\u000d\u0020-\u00ff]/g, "?");
}

function wrapLine(value: string, maxLength: number) {
  const words = value.split(" ");
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    if (`${current} ${word}`.trim().length > maxLength) {
      if (current) {
        lines.push(current);
      }
      current = word;
    } else {
      current = `${current} ${word}`.trim();
    }
  }

  if (current) {
    lines.push(current);
  }

  return lines.length ? lines : [""];
}
