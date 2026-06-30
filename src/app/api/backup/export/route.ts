import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
    }

    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5500';
    const res = await fetch(`${backendUrl}/api/backup/export`);
    
    if (!res.ok) throw new Error('Backend failed');

    const data = await res.arrayBuffer();
    
    return new NextResponse(data, {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="quotesys_backup_${new Date().getTime()}.json"`
      }
    });
  } catch (error) {
    console.error('Backup export proxy error:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
