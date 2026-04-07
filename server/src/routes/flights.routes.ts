import { Router } from 'express'
import {
  listFlights,
  listSerpFlights,
  listSerpTravelExplore,
} from '../controllers/flightsController.js'
import { asyncHandler } from '../utils/asyncHandler.js'

const router = Router()

router.get('/serp', asyncHandler(listSerpFlights))
router.get('/explore', asyncHandler(listSerpTravelExplore))
router.get('/', asyncHandler(listFlights))

export default router
