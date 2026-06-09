import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";

export async function GET(_req: NextRequest, { params }: { params: { filename: string } }) {
  // Solo permite nombres seguros (sin path traversal)
  const name = params.filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  const filepath = join(process.cwd(), "uploads", name);
  try {
    const data = await readFile(filepath);
    return new NextResponse(data, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${name}"`,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    return NextResponse.json({ error: "Archivo no encontrado" }, { status: 404 });
  }
}
