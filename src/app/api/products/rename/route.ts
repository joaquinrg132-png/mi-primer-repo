import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PATCH(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 });

    const body = await request.json();
    const { name } = body;
    if (!name?.trim()) return NextResponse.json({ error: 'Nombre requerido' }, { status: 400 });

    const updated = await prisma.product.update({
      where: { id },
      data: { name: name.trim(), updatedBy: body.UserId || 'system' }
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Rename error:', error);
    return NextResponse.json({ error: 'Error al renombrar' }, { status: 500 });
  }
}
