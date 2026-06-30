import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
    }

    const body = await req.json();
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5500';
    
    const res = await fetch(`${backendUrl}/api/backup/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    
    const data = await res.json();
    
    if (!res.ok) {
      return NextResponse.json({ error: data.message || 'Error al importar' }, { status: res.status });
    }
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Backup import proxy error:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
