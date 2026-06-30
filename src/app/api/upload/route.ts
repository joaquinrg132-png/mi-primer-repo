import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: "Archivo requerido" }, { status: 400 });
    }

    // Max 10MB
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "El archivo no puede pesar más de 10MB" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const base64 = buffer.toString("base64");
    const mimeType = file.type || "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    const dataUri = `data:${mimeType};base64,${base64}`;

    // Return the base64 data URI as the fileUrl — stored directly in DB
    return NextResponse.json({ 
      success: true, 
      fileUrl: dataUri,
      fileName: file.name 
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, error: "Error al subir archivo" }, { status: 500 });
  }
}
