import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 });

    const product = await prisma.product.findUnique({ 
      where: { id },
      select: { imageUrl: true }
    });

    if (!product || !product.imageUrl) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    if (product.imageUrl.startsWith('data:')) {
      const matches = product.imageUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (matches) {
        const mimeType = matches[1];
        const buffer = Buffer.from(matches[2], 'base64');
        return new Response(buffer, {
          headers: {
            'Content-Type': mimeType,
            'Cache-Control': 'public, max-age=31536000, immutable'
          }
        });
      }
    }

    // fallback if it was an old path
    return NextResponse.redirect(product.imageUrl);
  } catch (error) {
    console.error('Image error:', error);
    return NextResponse.json({ error: 'Error al cargar imagen' }, { status: 500 });
  }
}
