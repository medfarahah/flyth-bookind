import type { Request, Response } from 'express'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { prisma } from '../db.js'
import { AppError } from '../utils/AppError.js'

const SALT_ROUNDS = 10

function signToken(user: { id: string; email: string }) {
  const secret = process.env.JWT_SECRET
  if (!secret) throw new AppError('Server misconfiguration.', 500)
  return jwt.sign({ sub: user.id, email: user.email }, secret, { expiresIn: '7d' })
}

export async function register(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body as { email: string; password: string }

  const hash = await bcrypt.hash(password, SALT_ROUNDS)
  const user = await prisma.user.create({
    data: { email: email.toLowerCase(), password: hash },
    select: { id: true, email: true, createdAt: true },
  })

  const token = signToken(user)
  res.status(201).json({ token, user: { id: user.id, email: user.email } })
}

export async function login(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body as { email: string; password: string }

  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  })
  if (!user) {
    throw new AppError('Invalid email or password.', 401)
  }

  const ok = await bcrypt.compare(password, user.password)
  if (!ok) {
    throw new AppError('Invalid email or password.', 401)
  }

  const token = signToken(user)
  res.json({
    token,
    user: { id: user.id, email: user.email },
  })
}
