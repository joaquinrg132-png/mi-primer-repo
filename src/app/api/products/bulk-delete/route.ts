import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const ids: string[] = await request.json();
    if (!ids?.length) return NextResponse.json({ error: 'No IDs provided' }, { status: 400 });

    await prisma.product.deleteMany({ where: { id: { in: ids } } });
    return NextResponse.json({ success: true, deleted: ids.length });
  } catch (error) {
    console.error('Bulk delete error:', error);
    return NextResponse.json({ error: 'Error al eliminar productos' }, { status: 500 });
  }
}
