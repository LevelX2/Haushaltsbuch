import { NextResponse } from "next/server";
import { ZodError } from "zod";

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function created<T>(data: T) {
  return NextResponse.json(data, { status: 201 });
}

export function routeError(error: unknown) {
  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: "Validierungsfehler",
        details: error.flatten(),
      },
      { status: 400 },
    );
  }

  console.error(error);
  return NextResponse.json(
    {
      error: "Unerwarteter Fehler",
      details: error instanceof Error ? error.message : String(error),
    },
    { status: 500 },
  );
}

export async function readJson(request: Request) {
  const text = await request.text();
  if (!text) {
    return {};
  }

  return JSON.parse(text) as unknown;
}
