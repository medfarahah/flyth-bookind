/**
 * Vercel serverless — handles /api and /api/*
 */
import serverless from 'serverless-http'
import app from '../server/src/app.js'

export default serverless(app)
