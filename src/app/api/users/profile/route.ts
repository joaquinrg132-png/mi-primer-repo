import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id } = session.user as any;
    const body = await req.json();

    const updateData: any = {};
    if (body.image !== undefined) updateData.image = body.image;
    if (body.status !== undefined) updateData.status = body.status;
    
    // Always update lastSeen on any activity here
    updateData.lastSeen = new Date();

    const user = await prisma.user.update({
      where: { id },
      data: updateData
    });

    return NextResponse.json({ success: true, user });
  } catch (error) {
    console.error('Update profile error:', error);
    return NextResponse.json({ error: 'Error al actualizar el perfil' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  // Used to ping last seen
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id } = session.user as any;
    await prisma.user.update({
      where: { id },
      data: { lastSeen: new Date() }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Error al actualizar ping' }, { status: 500 });
  }
}
