import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    const currentUserId = (session.user as any).id;

    const { searchParams } = new URL(req.url);
    const conversationId = searchParams.get('conversationId');

    if (!conversationId) {
      return NextResponse.json({ error: "conversationId es requerido" }, { status: 400 });
    }

    // Check if user is part of the conversation
    const participant = await prisma.conversationParticipant.findUnique({
      where: {
        userId_conversationId: {
          userId: currentUserId,
          conversationId: conversationId
        }
      }
    });

    if (!participant) {
      return NextResponse.json({ error: "No tienes acceso a esta conversación" }, { status: 403 });
    }

    // Update lastReadAt
    await prisma.conversationParticipant.update({
      where: {
        userId_conversationId: { userId: currentUserId, conversationId }
      },
      data: { lastReadAt: new Date() }
    });

    const allMessages = await prisma.message.findMany({
      where: { conversationId },
      include: {
        sender: {
          select: { id: true, name: true, username: true, image: true }
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    // Filter out messages that this user has deleted for themselves
    const messages = allMessages.filter(msg => !msg.deletedFor.includes(currentUserId));

    return NextResponse.json({ success: true, messages });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, error: "Error al cargar mensajes" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    const currentUserId = (session.user as any).id;

    const { conversationId, content, fileUrl, fileName } = await req.json();

    if (!conversationId || (!content && !fileUrl)) {
      return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
    }

    // Check access
    const participant = await prisma.conversationParticipant.findUnique({
      where: {
        userId_conversationId: {
          userId: currentUserId,
          conversationId: conversationId
        }
      }
    });

    if (!participant) {
      return NextResponse.json({ error: "No tienes acceso a esta conversación" }, { status: 403 });
    }

    const message = await prisma.message.create({
      data: {
        content: content || null,
        fileUrl: fileUrl || null,
        fileName: fileName || null,
        conversationId,
        senderId: currentUserId
      },
      include: {
        sender: {
          select: { id: true, name: true, username: true, image: true }
        }
      }
    });

    // Update conversation updatedAt timestamp
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() }
    });

    return NextResponse.json({ success: true, message });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, error: "Error al enviar mensaje" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    const currentUserId = (session.user as any).id;
    const isAdmin = (session.user as any).role === 'ADMIN';

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const type = searchParams.get('type') || 'me'; // 'me' o 'all'

    if (!id) return NextResponse.json({ error: "ID de mensaje requerido" }, { status: 400 });

    const message = await prisma.message.findUnique({ where: { id } });
    if (!message) return NextResponse.json({ error: "Mensaje no encontrado" }, { status: 404 });

    if (type === 'all') {
      const isOwner = message.senderId === currentUserId;
      const minutesSinceCreation = (new Date().getTime() - new Date(message.createdAt).getTime()) / 60000;

      // Admin can delete any message for everyone. Owner can delete for everyone if within 10 minutes.
      if (!isAdmin && (!isOwner || minutesSinceCreation > 10)) {
        return NextResponse.json({ error: "No puedes eliminar este mensaje para todos (han pasado más de 10 min)" }, { status: 403 });
      }

      // Soft delete: keep the record but remove its contents
      await prisma.message.update({
        where: { id },
        data: {
          isDeleted: true,
          content: null,
          fileUrl: null,
          fileName: null
        }
      });
    } else {
      // Eliminar solo para mí (agregar a deletedFor)
      if (!message.deletedFor.includes(currentUserId)) {
        await prisma.message.update({
          where: { id },
          data: {
            deletedFor: { push: currentUserId }
          }
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, error: "Error al eliminar mensaje" }, { status: 500 });
  }
}
