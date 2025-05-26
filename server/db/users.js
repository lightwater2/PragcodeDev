import { promises as fs } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'
import bcrypt from 'bcryptjs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const USERS_FILE = path.join(__dirname, 'users.json')

// Initialize users file with admin user
async function initializeUsers() {
  try {
    await fs.access(USERS_FILE)
  } catch {
    // File doesn't exist, create it with admin user
    const adminPassword = await bcrypt.hash('admin123', 10)
    const initialUsers = {
      users: [
        {
          id: '1',
          username: 'admin',
          password: adminPassword,
          role: 'admin',
          createdAt: new Date().toISOString()
        }
      ]
    }
    await fs.writeFile(USERS_FILE, JSON.stringify(initialUsers, null, 2))
    console.log('Created initial admin user (username: admin, password: admin123)')
  }
}

// Load users from file
async function loadUsers() {
  try {
    const data = await fs.readFile(USERS_FILE, 'utf-8')
    return JSON.parse(data)
  } catch {
    return { users: [] }
  }
}

// Save users to file
async function saveUsers(data) {
  await fs.writeFile(USERS_FILE, JSON.stringify(data, null, 2))
}

// Find user by username
export async function findUserByUsername(username) {
  const data = await loadUsers()
  return data.users.find(user => user.username === username)
}

// Create new user
export async function createUser(username, password, role = 'user') {
  const data = await loadUsers()
  
  // Check if username already exists
  if (data.users.find(user => user.username === username)) {
    throw new Error('Username already exists')
  }
  
  const hashedPassword = await bcrypt.hash(password, 10)
  const newUser = {
    id: Date.now().toString(),
    username,
    password: hashedPassword,
    role,
    createdAt: new Date().toISOString()
  }
  
  data.users.push(newUser)
  await saveUsers(data)
  
  return { id: newUser.id, username: newUser.username, role: newUser.role }
}

// Verify password
export async function verifyPassword(password, hashedPassword) {
  return bcrypt.compare(password, hashedPassword)
}

// Initialize on module load
initializeUsers()