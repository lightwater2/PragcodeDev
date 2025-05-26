import express from 'express'
import { build } from 'esbuild'
import path from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'
import { promises as fs } from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const router = express.Router()

// Bundle a specific package for browser use
router.post('/package', async (req, res) => {
  try {
    const { packageName } = req.body
    
    if (!packageName) {
      return res.status(400).json({ error: 'Package name is required' })
    }
    
    // Create a temporary entry file
    const tempDir = path.join(__dirname, '../../temp')
    await fs.mkdir(tempDir, { recursive: true })
    
    const entryFile = path.join(tempDir, `${packageName}-entry.js`)
    await fs.writeFile(entryFile, `export * from '${packageName}'`)
    
    // Bundle with esbuild
    const result = await build({
      entryPoints: [entryFile],
      bundle: true,
      format: 'esm',
      platform: 'browser',
      target: 'es2020',
      write: false,
      external: ['react', 'react-dom']
    })
    
    // Clean up
    await fs.unlink(entryFile)
    
    const code = result.outputFiles[0].text
    
    res.json({
      success: true,
      packageName,
      code,
      format: 'esm'
    })
    
  } catch (error) {
    console.error('Bundle error:', error)
    res.status(500).json({
      error: 'Failed to bundle package',
      message: error.message
    })
  }
})

export default router