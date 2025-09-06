import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

// Middleware to verify JWT token
function verifyToken(request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  
  const token = authHeader.substring(7);
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return null;
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const sellerId = searchParams.get('sellerId');

    let whereClause = {};

    if (category && category !== 'all') {
      whereClause.category = category;
    }

    if (search) {
      whereClause.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }

    if (sellerId) {
      whereClause.sellerId = sellerId;
    }

    const products = await prisma.product.findMany({
      where: whereClause,
      include: {
        images: true,
        seller: {
          select: {
            id: true,
            name: true,
            email: true,
            university: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(products);
  } catch (error) {
    console.error('Get products error:', error);
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const user = verifyToken(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const title = formData.get('title');
    const description = formData.get('description');
    const price = parseFloat(formData.get('price'));
    const category = formData.get('category');
    const condition = formData.get('condition');
    const specifications = formData.get('specifications');
    const images = formData.getAll('images');

    if (!title || !description || !price || !category) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Create product
    const product = await prisma.product.create({
      data: {
        title,
        description,
        price,
        category,
        condition: condition || 'Good',
        specifications: specifications ? specifications.split(',').map(s => s.trim()) : [],
        sellerId: user.userId,
        status: 'active'
      },
      include: {
        images: true,
        seller: {
          select: {
            id: true,
            name: true,
            email: true,
            university: true
          }
        }
      }
    });

    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    console.error('Create product error:', error);
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 });
  }
}
