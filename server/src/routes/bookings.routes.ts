import { Router } from 'express'
import { body } from 'express-validator'
import { createBooking, listMyBookings } from '../controllers/bookingsController.js'
import { requireAuth } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'
import { asyncHandler } from '../utils/asyncHandler.js'

const router = Router()

router.use(requireAuth)

router.post(
  '/',
  body('flightId').isUUID().withMessage('Valid flightId is required.'),
  body('passengers').isArray({ min: 1 }).withMessage('passengers must be a non-empty array.'),
  body('passengers.*.fullName').trim().notEmpty().withMessage('Passenger fullName is required.'),
  body('passengers.*.email').trim().isEmail().withMessage('Passenger email must be valid.'),
  body('passengers.*.phone').trim().notEmpty().withMessage('Passenger phone is required.'),
  validate,
  asyncHandler(createBooking)
)

router.get('/my', asyncHandler(listMyBookings))

export default router
