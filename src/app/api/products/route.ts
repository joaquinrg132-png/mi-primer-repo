import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search');

  try {
    const products = await prisma.product.findMany({
      where: search ? {
        name: {
          contains: search,
        }
      } : undefined,
      select: {
        id: true,
        name: true,
        sheetName: true,
        characteristics: true,
        length: true,
        description: true,
        sourceFileName: true,
        version: true,
        updatedAt: true,
        updatedBy: true,
        categoryId: true,
        category: true,
        createdAt: true,
      },
      orderBy: {
        updatedAt: 'desc'
      }
    });

    return NextResponse.json(products);
  } catch (error) {
    console.error("Database connection error (waiting for Postgres URL):", error);
    // Fallback de demostración si no hay URL de Postgres
    return NextResponse.json([
      {
        id: "mock-1",
        name: "Patas de Pollo Deshidratadas 500g",
        category: { name: "Carnes y Aves" },
        version: 3,
        updatedAt: new Date().toISOString()
      },
      {
        id: "mock-2",
        name: "Correa Reflectante para Perro - PetSmart",
        category: { name: "Accesorios Mascotas" },
        version: 2,
        updatedAt: new Date().toISOString()
      }
    ].filter(p => search ? p.name.toLowerCase().includes(search.toLowerCase()) : true));
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

    const product = await prisma.product.create({
      data: {
        name: data.name,
        categoryId: category.id,
        fileUrl: data.fileUrl || null,
        sheetName: data.sheetName || null,
        characteristics: data.characteristics || null,
        length: data.length || null,
        description: data.description || null,
        imageUrl: data.imageUrl || null,
        sourceFileName: data.sourceFileName || null,
        updatedBy: data.userId || 'system',
      }
    });

    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    console.error('Create product error:', error);
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

    await prisma.product.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete error:", error);
    // Para efectos de la maqueta, si falla la BD Postgres, devolvemos success simulado
    return NextResponse.json({ success: true, simulated: true });
  }
}
