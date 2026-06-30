import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Download full book — finds products by sourceFileName and serves the first one's file
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
      const matches = product.fileUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (matches) {
        const mimeType = matches[1];
        const buffer = Buffer.from(matches[2], 'base64');
        let ext = '.xlsx';
        if (product.sourceFileName) {
          const match = product.sourceFileName.match(/\.[0-9a-z]+$/i);
          if (match) ext = match[0];
        }
        const fileName = product.sourceFileName || `${product.name.replace(/[^a-z0-9]/gi, '_')}${ext}`;
        return new Response(buffer, {
          headers: {
            'Content-Type': mimeType,
            'Content-Disposition': `attachment; filename="${fileName}"`,
          }
        });
      }
    }

    return NextResponse.redirect(product.fileUrl);
  } catch (error) {
    console.error('Download book error:', error);
    return NextResponse.json({ error: 'Error al descargar' }, { status: 500 });
  }
}
