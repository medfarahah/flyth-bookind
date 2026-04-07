import type { Request, Response } from 'express'
import type { Prisma } from '../generated/prisma/client.js'
import { prisma } from '../db.js'
import { AppError } from '../utils/AppError.js'

type PassengerInput = { fullName?: string; email?: string; phone?: string }

export async function createBooking(req: Request, res: Response): Promise<void> {
  const { flightId, passengers } = req.body as {
    flightId: string
    passengers: PassengerInput[]
  }

  if (!Array.isArray(passengers) || passengers.length === 0) {
    throw new AppError('At least one passenger is required.', 400)
  }

  for (const p of passengers) {
    if (!p?.fullName?.trim() || !p?.email?.trim() || !p?.phone?.trim()) {
      throw new AppError('Each passenger needs fullName, email, and phone.', 400)
    }
  }

  const flight = await prisma.flight.findUnique({ where: { id: flightId } })
  if (!flight) {
    throw new AppError('Flight not found.', 404)
  }

  const unit = Number(flight.price)
  const totalPrice = unit * passengers.length

  const userId = req.userId
  if (!userId) {
    throw new AppError('Authentication required.', 401)
  }

  const booking = await prisma.booking.create({
    data: {
      userId,
      flightId,
      passengers: passengers as Prisma.InputJsonValue,
      totalPrice,
    },
    include: { flight: true },
  })

  res.status(201).json({
    id: booking.id,
    totalPrice: Number(booking.totalPrice),
    passengers: booking.passengers,
    createdAt: booking.createdAt,
    flight: {
      ...booking.flight,
      price: Number(booking.flight.price),
    },
  })
}

export async function listMyBookings(req: Request, res: Response): Promise<void> {
  const userId = req.userId
  if (!userId) {
    throw new AppError('Authentication required.', 401)
  }

  const rows = await prisma.booking.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    include: { flight: true },
  })

  res.json(
    rows.map((b) => ({
      id: b.id,
      totalPrice: Number(b.totalPrice),
      passengers: b.passengers,
      createdAt: b.createdAt,
      flight: {
        ...b.flight,
        price: Number(b.flight.price),
      },
    }))
  )
}
