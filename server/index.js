import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import chatRouter from './routes/chat.js'
import projectRouter from './routes/project.js'
import authRouter from './routes/auth.js'

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const app = express()
const PORT = process.env.PORT || 3001

// Middleware
app.use(cors())
app.use(express.json())

// Routes
app.use('/api/auth', authRouter)
app.use('/api/chat', chatRouter)
app.use('/api/project', projectRouter)
// app.use('/api/vite', viteDevRouter) // Commented out - needs vite dependency

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).json({
    error: 'Something went wrong!',
    message: err.message
  })
})

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})