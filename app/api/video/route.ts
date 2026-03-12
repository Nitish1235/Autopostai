import { NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/db/prisma'
import type { Prisma } from '@prisma/client'

// ── Query Params Schema ──────────────────────────────

const QuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.string().optional(),
  platform: z.string().optional(),
  search: z.string().optional(),
  sortBy: z.enum(['createdAt', 'views', 'postedAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
})

// ── GET — Paginated Video List ───────────────────────

export async function GET(request: Request) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const parsed = QuerySchema.safeParse(Object.fromEntries(searchParams))

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid query parameters', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const {
      page,
      limit,
      status,
      platform,
      search,
      sortBy,
      sortOrder,
      startDate,
      endDate,
    } = parsed.data

    // Build where clause
    const where: Prisma.VideoWhereInput = {
      userId: userId,
    }

    if (status) {
      where.status = status as Prisma.EnumVideoStatusFilter
    }

    if (platform) {
      where.platforms = { has: platform }
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { topic: { contains: search, mode: 'insensitive' } },
      ]
    }

    if (startDate || endDate) {
      where.createdAt = {}
      if (startDate) {
        (where.createdAt as Prisma.DateTimeFilter).gte = new Date(startDate)
      }
      if (endDate) {
        (where.createdAt as Prisma.DateTimeFilter).lte = new Date(endDate)
      }
    }

    // Build orderBy
    let orderBy: Prisma.VideoOrderByWithRelationInput
    switch (sortBy) {
      case 'views':
        orderBy = { analytics: { totalViews: sortOrder } }
        break
      case 'postedAt':
        orderBy = { postedAt: sortOrder }
        break
      default:
        orderBy = { createdAt: sortOrder }
    }

    // Execute queries
    const skip = (page - 1) * limit

    const [videos, total] = await Promise.all([
      prisma.video.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: { analytics: true },
      }),
      prisma.video.count({ where }),
    ])

    const totalPages = Math.ceil(total / limit)

    return NextResponse.json({
      success: true,
      data: {
        videos,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
      },
    })
  } catch (error) {
    console.error('[video/list] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
