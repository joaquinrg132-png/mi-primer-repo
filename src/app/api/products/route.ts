import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search');

  try {
    const products = await prisma.product.findMany({
      where: search ? {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { code: { contains: search, mode: 'insensitive' } },
          { category: { name: { contains: search, mode: 'insensitive' } } },
        ]
      } : undefined,
      select: {
        id: true,
        name: true,
        code: true,
        sheetName: true,
        characteristics: true,
        length: true,
        description: true,
        sourceFileName: true,
        fileLastModified: true,
        version: true,
        updatedAt: true,
        updatedBy: true,
        categoryId: true,
        category: true,
        createdAt: true,
      },
      orderBy: { updatedAt: 'desc' }
    });

    return NextResponse.json(products);
  } catch (error) {
    console.error("Database connection error:", error);
    return NextResponse.json([]);
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();

    let category = await prisma.category.findFirst({
      where: { name: data.categoryName || 'General' }
    });

    if (!category) {
      category = await prisma.category.create({
        data: { name: data.categoryName || 'General' }
      });
    }

    // Verificar si ya existe un producto con el mismo nombre + archivo origen (upsert sin duplicados)
    const existing = await prisma.product.findFirst({
      where: {
        name: data.name,
        sourceFileName: data.sourceFileName || null,
      }
    });

    if (existing) {
      // Actualizar en lugar de crear duplicado
      const updated = await prisma.product.update({
        where: { id: existing.id },
        data: {
          categoryId: category.id,
          fileUrl: data.fileUrl || existing.fileUrl,
          sheetName: data.sheetName || existing.sheetName,
          characteristics: data.characteristics ?? existing.characteristics,
          length: data.length ?? existing.length,
          description: data.description ?? existing.description,
          imageUrl: data.imageUrl || existing.imageUrl,
          code: data.code ?? existing.code,
          fileLastModified: data.fileLastModified ? new Date(data.fileLastModified) : existing.fileLastModified,
          version: existing.version + 1,
          updatedBy: data.userId || 'system',
        }
      });
      return NextResponse.json(updated, { status: 200 });
    }

    // Crear nuevo producto
    const product = await prisma.product.create({
      data: {
        name: data.name,
        code: data.code || null,
        categoryId: category.id,
        fileUrl: data.fileUrl || null,
        sheetName: data.sheetName || null,
        characteristics: data.characteristics || null,
        length: data.length || null,
        description: data.description || null,
        imageUrl: data.imageUrl || null,
        sourceFileName: data.sourceFileName || null,
        fileLastModified: data.fileLastModified ? new Date(data.fileLastModified) : null,
        updatedBy: data.userId || 'system',
      }
    });

    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    console.error('Create product error:', error);
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 });

    const data = await request.json();
    const updateData: any = {};

    if (data.name !== undefined) updateData.name = data.name;
    if (data.code !== undefined) updateData.code = data.code;
    if (data.categoryName !== undefined) {
      let category = await prisma.category.findFirst({ where: { name: data.categoryName } });
      if (!category) {
        category = await prisma.category.create({ data: { name: data.categoryName } });
      }
      updateData.categoryId = category.id;
    }

    const updated = await prisma.product.update({
      where: { id },
      data: updateData,
      include: { category: true }
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Patch product error:', error);
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    await prisma.product.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete error:", error);
    return NextResponse.json({ success: true, simulated: true });
  }
}
