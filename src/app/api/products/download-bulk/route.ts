import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Descarga masiva de hojas seleccionadas como un ZIP
export async function POST(request: Request) {
  try {
    const ids: string[] = await request.json();
    if (!ids || !ids.length) {
      return NextResponse.json({ error: 'Se requieren IDs de productos' }, { status: 400 });
    }

    const products = await prisma.product.findMany({
      where: { id: { in: ids } },
      select: { id: true, name: true, sourceFileName: true, fileUrl: true }
    });

    const JSZip = (await import('jszip')).default;
    const zip = new JSZip();

    for (const product of products) {
      if (!product.fileUrl || !product.fileUrl.startsWith('data:')) continue;

      const matches = product.fileUrl.match(/^data:([^;]+);base64,([\s\S]+)$/);
      if (!matches) continue;

      const buffer = Buffer.from(matches[2], 'base64');

      // Determinar extensión desde el nombre del archivo original
      let ext = '.xlsx';
      if (product.sourceFileName) {
        const match = product.sourceFileName.match(/\.[0-9a-z]+$/i);
        if (match) ext = match[0].toLowerCase();
      }

      const safeName = product.name.replace(/[^a-z0-9áéíóúñü ]/gi, '_');
      zip.file(`${safeName}${ext}`, buffer);
    }

    const zipBuffer = await zip.generateAsync({ type: 'uint8array' });

    return new Response(zipBuffer as any, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': 'attachment; filename="hojas_seleccionadas.zip"',
      }
    });
  } catch (error) {
    console.error('Bulk download error:', error);
    return NextResponse.json({ error: 'Error al generar ZIP' }, { status: 500 });
  }
}
