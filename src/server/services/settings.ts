import fs from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { defaultSettings } from "@/server/default-settings";
import { prisma } from "@/server/prisma";

const settingsInput = z.record(z.string().trim().min(1));

export async function getSettings() {
  await ensureDefaultSettings();
  const rows = await prisma.appSetting.findMany({ orderBy: { key: "asc" } });
  return Object.fromEntries(rows.map((row) => [row.key, row]));
}

export async function updateSettings(raw: unknown) {
  const input = settingsInput.parse(raw);

  for (const [key, value] of Object.entries(input)) {
    await prisma.appSetting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });

    if (key.endsWith("Dir") || key.endsWith("Root")) {
      await fs.mkdir(value, { recursive: true });
    }

    if (key === "databasePath") {
      await fs.mkdir(path.dirname(value), { recursive: true });
    }
  }

  return getSettings();
}

export async function settingValue(key: string) {
  const settings = await getSettings();
  return settings[key]?.value ?? defaultSettings().find((setting) => setting.key === key)?.value ?? "";
}

async function ensureDefaultSettings() {
  for (const setting of defaultSettings()) {
    await prisma.appSetting.upsert({
      where: { key: setting.key },
      update: { label: setting.label },
      create: setting,
    });
  }
}
