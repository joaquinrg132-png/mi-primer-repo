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

    if (!product?.imageUrl) {
      // Devolver imagen placeholder en lugar de 404
      return NextResponse.redirect(new URL('/images/product_placeholder.svg', request.url));
    }

    if (product.imageUrl.startsWith('data:')) {
      const matches = product.imageUrl.match(/^data:([^;]+);base64,([\s\S]+)$/);
      if (matches) {
        const mimeType = matches[1];
        const buffer = Buffer.from(matches[2], 'base64');
        return new Response(buffer, {
          headers: {
            'Content-Type': mimeType,
            'Cache-Control': 'public, max-age=3600',
          }
        });
      }
    }

    // Si es URL externa, redirigir
    return NextResponse.redirect(product.imageUrl);
  } catch (error) {
    console.error('Image error:', error);
    return NextResponse.redirect(new URL('/images/product_placeholder.svg', request.url));
  }
}
