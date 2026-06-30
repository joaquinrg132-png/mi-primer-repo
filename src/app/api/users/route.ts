import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";

export async function GET(req: NextRequest) {
  try {
    const users = await prisma.user.findMany({
      select: { 
        id: true, username: true, name: true, role: true, 
        bio: true, phone: true, email: true, image: true, coverImage: true, 
        status: true, lastSeen: true, createdAt: true 
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ success: true, users });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, error: "Error al obtener usuarios" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: "Solo los administradores pueden crear usuarios" }, { status: 403 });
    }

    const { username, name, password, role, bio, email, phone, image: uploadedImage } = await req.json();

    if (!username || !password) {
      return NextResponse.json({ error: "Nombre de usuario y contraseña son requeridos" }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { username } });
    if (existing) {
      return NextResponse.json({ error: "El nombre de usuario ya está en uso" }, { status: 400 });
    }

    // Check email uniqueness if provided
    if (email) {
      const emailExists = await prisma.user.findUnique({ where: { email } });
      if (emailExists) {
        return NextResponse.json({ error: "El correo electrónico ya está en uso" }, { status: 400 });
      }
    }

    const image = uploadedImage || `https://api.dicebear.com/7.x/notionists/svg?seed=${username}&backgroundColor=b6e3f4`;
    const coverImage = `https://images.unsplash.com/photo-1579546929518-9e396f3cc809?q=80&w=2070&auto=format&fit=crop`;

    const user = await prisma.user.create({
      data: {
        username,
        name: name || username,
        password,
        role: role || 'EMPLOYEE',
        bio: bio || 'Nuevo miembro del equipo.',
        email: email || null,
        phone: phone || null,
        image,
        coverImage
      }
    });

    return NextResponse.json({ success: true, user: { id: user.id, username: user.username } });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, error: "Error al crear usuario" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: "Solo los administradores pueden eliminar usuarios" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('id');

    if (!userId) {
      return NextResponse.json({ error: "ID de usuario requerido" }, { status: 400 });
    }

    const sessionUser = session.user as any;
    const userToDelete = await prisma.user.findUnique({ where: { id: userId } });
    if (userToDelete?.username === sessionUser.username) {
      return NextResponse.json({ error: "No puedes eliminar tu propia cuenta" }, { status: 400 });
    }

    await prisma.user.delete({ where: { id: userId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, error: "Error al eliminar usuario" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: "Solo los administradores pueden editar usuarios" }, { status: 403 });
    }

    const body = await req.json();
    const { id, username, name, role, email, phone, bio, password } = body;

    if (!id) return NextResponse.json({ error: "ID de usuario requerido" }, { status: 400 });

    const updateData: any = {
      username, name, role, email, phone, bio
    };

    if (password) {
      updateData.password = password;
    }

    const existing = await prisma.user.findFirst({
      where: {
        username,
        id: { not: id }
      }
    });

    if (existing) {
      return NextResponse.json({ error: "El nombre de usuario ya está en uso" }, { status: 400 });
    }

    if (email) {
      const emailExists = await prisma.user.findFirst({
        where: {
          email,
          id: { not: id }
        }
      });
      if (emailExists) {
        return NextResponse.json({ error: "El correo electrónico ya está en uso" }, { status: 400 });
      }
    }

    const updated = await prisma.user.update({
      where: { id },
      data: updateData
    });

    return NextResponse.json({ success: true, user: updated });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, error: "Error al editar usuario" }, { status: 500 });
  }
}
