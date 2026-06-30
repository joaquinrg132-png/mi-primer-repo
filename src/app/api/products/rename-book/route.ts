import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PATCH(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const oldName = searchParams.get('oldName');
    if (!oldName) return NextResponse.json({ error: 'oldName requerido' }, { status: 400 });

    const body = await request.json();
    const { name } = body;
    if (!name?.trim()) return NextResponse.json({ error: 'Nombre requerido' }, { status: 400 });

    // Update all products that share the same sourceFileName
    const result = await prisma.product.updateMany({
      where: { sourceFileName: oldName },
      data: { sourceFileName: name.trim() }
    });

    return NextResponse.json({ success: true, updated: result.count });
  } catch (error) {
    console.error('Rename book error:', error);
    return NextResponse.json({ error: 'Error al renombrar libro' }, { status: 500 });
  }
}
