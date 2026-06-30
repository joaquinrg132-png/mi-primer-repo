import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { secretKey } = await request.json();

    // La clave secreta para la demostración
    if (secretKey === 'ADMIN123') {
      const user = await prisma.user.update({
        where: { email: session.user.email },
        data: { role: 'ADMIN' }
      });
      return NextResponse.json({ success: true, role: user.role });
    } else {
      return NextResponse.json({ error: 'Clave incorrecta' }, { status: 403 });
    }
  } catch (error) {
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}
