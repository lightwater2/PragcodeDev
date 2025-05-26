import express from 'express'
import { promises as fs } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'
import { exec } from 'child_process'
import { promisify } from 'util'
import { verifyToken, requireAdmin } from '../middleware/auth.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const router = express.Router()
const execAsync = promisify(exec)

// User projects will be stored in a sandboxed directory
const PROJECTS_DIR = path.join(__dirname, '../../user-projects')

// Ensure projects directory exists
async function ensureProjectsDir() {
  try {
    await fs.mkdir(PROJECTS_DIR, { recursive: true })
  } catch (error) {
    console.error('Failed to create projects directory:', error)
  }
}

// Initialize
ensureProjectsDir()

// List all projects for a user (admin only)
router.get('/list', verifyToken, requireAdmin, async (req, res) => {
  try {
    const username = req.user.username
    
    // Get all directories in PROJECTS_DIR
    const allProjects = await fs.readdir(PROJECTS_DIR, { withFileTypes: true })
    
    // Filter for directories that belong to this user
    const userProjects = allProjects
      .filter(dirent => dirent.isDirectory() && dirent.name.startsWith(`${username}-`))
      .map(dirent => {
        const fullName = dirent.name
        const projectName = fullName.substring(username.length + 1) // Remove "username-" prefix
        return {
          fullName,
          displayName: projectName,
          path: path.join(PROJECTS_DIR, fullName)
        }
      })
    
    // Get additional info for each project
    const projectsWithInfo = await Promise.all(
      userProjects.map(async (project) => {
        try {
          // Check if package.json exists
          const packageJsonPath = path.join(project.path, 'package.json')
          const stats = await fs.stat(project.path)
          
          let description = ''
          try {
            const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'))
            description = packageJson.description || ''
          } catch (e) {
            // package.json doesn't exist or is invalid
          }
          
          return {
            ...project,
            description,
            lastModified: stats.mtime,
            created: stats.birthtime
          }
        } catch (error) {
          return project
        }
      })
    )
    
    res.json({
      success: true,
      projects: projectsWithInfo.sort((a, b) => 
        new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime()
      )
    })
    
  } catch (error) {
    console.error('Failed to list projects:', error)
    res.status(500).json({
      error: 'Failed to list projects',
      message: error.message
    })
  }
})

// Create a new project (admin only)
router.post('/create', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { projectName } = req.body
    
    if (!projectName) {
      return res.status(400).json({ error: 'Project name is required' })
    }
    
    // Sanitize project name and create user-specific directory
    const sanitizedName = projectName.replace(/[^a-zA-Z0-9-_]/g, '')
    const userProjectName = `${req.user.username}-${sanitizedName}`
    const projectPath = path.join(PROJECTS_DIR, userProjectName)
    
    // Create project directory
    await fs.mkdir(projectPath, { recursive: true })
    
    // Create package.json
    const packageJson = {
      name: sanitizedName,
      version: "1.0.0",
      description: "User project created in web IDE",
      main: "index.js",
      scripts: {
        dev: "vite",
        build: "vite build",
        preview: "vite preview"
      },
      dependencies: {
        react: "^18.2.0",
        "react-dom": "^18.2.0"
      },
      devDependencies: {
        "@types/react": "^18.2.0",
        "@types/react-dom": "^18.2.0",
        "@vitejs/plugin-react": "^4.0.0",
        "typescript": "^5.0.0",
        "vite": "^4.3.0"
      }
    }
    
    await fs.writeFile(
      path.join(projectPath, 'package.json'),
      JSON.stringify(packageJson, null, 2)
    )
    
    // Create vite.config.js
    const viteConfig = `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: true
  }
})
`
    
    await fs.writeFile(
      path.join(projectPath, 'vite.config.js'),
      viteConfig
    )
    
    // Create src directory
    await fs.mkdir(path.join(projectPath, 'src'), { recursive: true })
    
    res.json({
      success: true,
      projectName: userProjectName,
      originalName: sanitizedName,
      projectPath: projectPath
    })
    
  } catch (error) {
    console.error('Project creation error:', error)
    res.status(500).json({
      error: 'Failed to create project',
      message: error.message
    })
  }
})

// Save file to project (admin only)
router.post('/save-file', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { projectName, filePath, content } = req.body
    
    if (!projectName || !filePath || content === undefined) {
      return res.status(400).json({ error: 'Missing required fields' })
    }
    
    const sanitizedProjectName = projectName.replace(/[^a-zA-Z0-9-_]/g, '')
    const projectPath = path.join(PROJECTS_DIR, sanitizedProjectName)
    
    // Ensure file path is within project directory
    const fullPath = path.join(projectPath, filePath)
    if (!fullPath.startsWith(projectPath)) {
      return res.status(403).json({ error: 'Invalid file path' })
    }
    
    // Create directory if needed
    await fs.mkdir(path.dirname(fullPath), { recursive: true })
    
    // Write file
    await fs.writeFile(fullPath, content)
    
    res.json({
      success: true,
      filePath: filePath
    })
    
  } catch (error) {
    console.error('File save error:', error)
    res.status(500).json({
      error: 'Failed to save file',
      message: error.message
    })
  }
})

// Execute terminal command in project directory (admin only)
router.post('/terminal', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { projectName, command, isFromAI } = req.body
    
    if (!projectName || !command) {
      return res.status(400).json({ error: 'Project name and command are required' })
    }
    
    // Only AI can execute commands
    if (!isFromAI) {
      return res.status(403).json({ 
        error: 'Terminal access denied',
        message: 'Only AI can execute terminal commands'
      })
    }
    
    // No restrictions for AI - all commands allowed
    
    const sanitizedProjectName = projectName.replace(/[^a-zA-Z0-9-_]/g, '')
    const projectPath = path.join(PROJECTS_DIR, sanitizedProjectName)
    
    // Check if project exists
    try {
      await fs.stat(projectPath)
    } catch {
      return res.status(404).json({ error: 'Project not found' })
    }
    
    console.log(`Executing command in project ${sanitizedProjectName}: ${command}`)
    
    try {
      const { stdout, stderr } = await execAsync(command, {
        cwd: projectPath,
        env: process.env,
        timeout: 60000 // 1 minute timeout
      })
      
      res.json({
        success: true,
        output: stdout || stderr,
        command,
        projectPath
      })
    } catch (error) {
      res.json({
        success: false,
        output: error.message,
        command
      })
    }
    
  } catch (error) {
    console.error('Terminal error:', error)
    res.status(500).json({
      error: 'Terminal execution failed',
      message: error.message
    })
  }
})

// Get project files (admin only)
router.get('/files/:projectName', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { projectName } = req.params
    const sanitizedProjectName = projectName.replace(/[^a-zA-Z0-9-_]/g, '')
    const projectPath = path.join(PROJECTS_DIR, sanitizedProjectName)
    
    // Check if project exists
    try {
      await fs.stat(projectPath)
    } catch {
      return res.status(404).json({ error: 'Project not found' })
    }
    
    // Read all files recursively
    async function readDirRecursive(dir, baseDir = '') {
      const files = {}
      const entries = await fs.readdir(dir, { withFileTypes: true })
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name)
        const relativePath = path.join(baseDir, entry.name)
        
        if (entry.isDirectory() && entry.name !== 'node_modules') {
          Object.assign(files, await readDirRecursive(fullPath, relativePath))
        } else if (entry.isFile()) {
          const content = await fs.readFile(fullPath, 'utf-8')
          files[relativePath] = content
        }
      }
      
      return files
    }
    
    const files = await readDirRecursive(projectPath)
    
    res.json({
      success: true,
      projectName: sanitizedProjectName,
      files
    })
    
  } catch (error) {
    console.error('Get files error:', error)
    res.status(500).json({
      error: 'Failed to get project files',
      message: error.message
    })
  }
})

// Delete a project (admin only)
router.delete('/delete/:projectName', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { projectName } = req.params
    const username = req.user.username
    
    if (!projectName) {
      return res.status(400).json({ error: 'Project name is required' })
    }
    
    // Ensure the project belongs to the user
    const fullProjectName = projectName.includes('-') ? projectName : `${username}-${projectName}`
    const projectPath = path.join(PROJECTS_DIR, fullProjectName)
    
    // Check if project exists
    try {
      await fs.access(projectPath)
    } catch {
      return res.status(404).json({ error: 'Project not found' })
    }
    
    // Delete the project directory
    await fs.rm(projectPath, { recursive: true, force: true })
    
    res.json({
      success: true,
      message: `Project "${projectName}" deleted successfully`
    })
    
  } catch (error) {
    console.error('Delete project error:', error)
    res.status(500).json({
      error: 'Failed to delete project',
      message: error.message
    })
  }
})

export default router