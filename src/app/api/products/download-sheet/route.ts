import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Download individual product sheet — preserves original format (.xlsm, .xlsx, etc.)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 });

    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });

    if (!product.fileUrl) {
      return NextResponse.json({ error: 'Este producto no tiene archivo' }, { status: 404 });
    }

    if (product.fileUrl.startsWith('data:')) {
      const matches = product.fileUrl.match(/^data:([^;]+);base64,([\s\S]+)$/);
      if (matches) {
        const buffer = Buffer.from(matches[2], 'base64');

        // Determinar extensión y Content-Type desde el nombre del archivo original
        let ext = '.xlsx';
        let contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

        if (product.sourceFileName) {
          const match = product.sourceFileName.match(/\.[0-9a-z]+$/i);
          if (match) {
            ext = match[0].toLowerCase();
            if (ext === '.xlsm') {
              contentType = 'application/vnd.ms-excel.sheet.macroenabled.12';
            } else if (ext === '.xls') {
              contentType = 'application/vnd.ms-excel';
            }
          }
        }

        const safeName = product.name.replace(/[^a-z0-9áéíóúñü ]/gi, '_');
        const fileName = `${safeName}${ext}`;

        // Devolver archivo tal cual — SIN re-empaquetar con JSZip para no corromper .xlsm
        return new Response(buffer, {
          headers: {
            'Content-Type': contentType,
            'Content-Disposition': `attachment; filename="${fileName}"`,
          }
        });
      }
    }

    // Fallback: redirigir si es URL externa
    return NextResponse.redirect(product.fileUrl);
  } catch (error) {
    console.error('Download error:', error);
    return NextResponse.json({ error: 'Error al descargar' }, { status: 500 });
  }
}
