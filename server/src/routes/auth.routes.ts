import { Router } from 'express'
import { body } from 'express-validator'
import { register, login } from '../controllers/authController.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { validate } from '../middleware/validate.js'

const router = Router()

const emailRule = body('email').trim().isEmail().withMessage('Valid email is required.')
const passwordRule = body('password')
  .isString()
  .isLength({ min: 8 })
  .withMessage('Password must be at least 8 characters.')

router.post('/register', emailRule, passwordRule, validate, asyncHandler(register))
router.post('/login', emailRule, body('password').isString().notEmpty(), validate, asyncHandler(login))

export default router
