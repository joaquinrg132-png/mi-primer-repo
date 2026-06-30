import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    const userId = (session.user as any).id;

    const conversations = await prisma.conversation.findMany({
      where: {
        participants: {
          some: {
            userId: userId
          }
        }
      },
      include: {
        participants: {
          include: {
            user: {
              select: { id: true, name: true, username: true, image: true, role: true, status: true, lastSeen: true }
            }
          }
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      },
      orderBy: { updatedAt: 'desc' }
    });
    const enrichedConversations = conversations.map(conv => {
      const myParticipant = conv.participants.find(p => p.userId === userId);
      const lastMsg = conv.messages[0];
      let hasUnread = false;
      if (lastMsg && myParticipant && lastMsg.senderId !== userId && !lastMsg.deletedFor.includes(userId)) {
        if (new Date(lastMsg.createdAt).getTime() > new Date(myParticipant.lastReadAt).getTime()) {
          hasUnread = true;
        }
      }
      return { ...conv, hasUnread };
    });

    return NextResponse.json({ success: true, conversations: enrichedConversations });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, error: "Error al cargar conversaciones" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    const currentUserId = (session.user as any).id;

    const { type, name, participantIds } = await req.json();

    if (!participantIds || !Array.isArray(participantIds) || participantIds.length === 0) {
      return NextResponse.json({ error: "Debe seleccionar participantes" }, { status: 400 });
    }

    const allParticipantIds = Array.from(new Set([currentUserId, ...participantIds]));

    if (type === 'DIRECT') {
      if (allParticipantIds.length !== 2) {
        return NextResponse.json({ error: "Un chat directo debe tener exactamente 2 participantes" }, { status: 400 });
      }

      // Check if direct chat already exists
      const existingConvos = await prisma.conversation.findMany({
        where: { type: 'DIRECT' },
        include: { participants: true }
      });

      const existingDirect = existingConvos.find(c => 
        c.participants.length === 2 && 
        c.participants.every(p => allParticipantIds.includes(p.userId))
      );

      if (existingDirect) {
        return NextResponse.json({ success: true, conversation: existingDirect });
      }
    }

    // Create new conversation
    const conversation = await prisma.conversation.create({
      data: {
        type: type === 'GROUP' ? 'GROUP' : 'DIRECT',
        name: type === 'GROUP' ? name || 'Nuevo Grupo' : null,
        participants: {
          create: allParticipantIds.map(id => ({ userId: id }))
        }
      },
      include: {
        participants: {
          include: {
            user: {
              select: { id: true, name: true, username: true, image: true, role: true, status: true, lastSeen: true }
            }
          }
        }
      }
    });

    return NextResponse.json({ success: true, conversation });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, error: "Error al crear la conversación" }, { status: 500 });
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

    if (!id) return NextResponse.json({ error: "ID de conversación requerido" }, { status: 400 });

    const participant = await prisma.conversationParticipant.findUnique({
      where: {
        userId_conversationId: {
          userId: currentUserId,
          conversationId: id
        }
      }
    });

    if (!participant && !isAdmin) {
      return NextResponse.json({ error: "No tienes permiso para eliminar esta conversación" }, { status: 403 });
    }

    await prisma.conversation.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, error: "Error al eliminar conversación" }, { status: 500 });
  }
}
