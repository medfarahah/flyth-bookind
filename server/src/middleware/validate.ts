import type { NextFunction, Request, Response } from 'express'
import { validationResult } from 'express-validator'
import { AppError } from '../utils/AppError.js'

export function validate(req: Request, _res: Response, next: NextFunction): void {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    const msg = errors
      .array()
      .map((e) => e.msg)
      .join(' ')
    return next(new AppError(msg, 422))
  }
  next()
}
