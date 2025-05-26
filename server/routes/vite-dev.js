import express from 'express'
import { createServer as createViteServer } from 'vite'
import path from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'
import { verifyToken, requireAdmin } from '../middleware/auth.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const router = express.Router()

// Store Vite instances for each project
const viteServers = new Map()

// Start Vite dev server for a project
router.post('/start', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { projectName } = req.body
    
    if (!projectName) {
      return res.status(400).json({ error: 'Project name is required' })
    }
    
    // Check if server already exists
    if (viteServers.has(projectName)) {
      return res.json({ 
        success: true, 
        message: 'Vite server already running',
        port: viteServers.get(projectName).config.server.port 
      })
    }
    
    const projectPath = path.join(__dirname, '../../user-projects', projectName)
    
    // Create Vite server
    const vite = await createViteServer({
      root: projectPath,
      server: {
        port: 3000 + viteServers.size, // Dynamic port assignment
        hmr: {
          port: 3100 + viteServers.size
        }
      },
      configFile: false,
      plugins: []
    })
    
    await vite.listen()
    
    viteServers.set(projectName, vite)
    
    res.json({
      success: true,
      message: 'Vite server started',
      port: vite.config.server.port,
      hmrPort: vite.config.server.hmr.port
    })
    
  } catch (error) {
    console.error('Vite server error:', error)
    res.status(500).json({
      error: 'Failed to start Vite server',
      message: error.message
    })
  }
})

// Stop Vite dev server
router.post('/stop', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { projectName } = req.body
    
    if (!projectName) {
      return res.status(400).json({ error: 'Project name is required' })
    }
    
    const vite = viteServers.get(projectName)
    if (vite) {
      await vite.close()
      viteServers.delete(projectName)
    }
    
    res.json({
      success: true,
      message: 'Vite server stopped'
    })
    
  } catch (error) {
    console.error('Vite stop error:', error)
    res.status(500).json({
      error: 'Failed to stop Vite server',
      message: error.message
    })
  }
})

export default router