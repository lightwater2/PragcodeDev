# Authentication System Implementation

## Overview
A complete authentication system has been implemented with JWT tokens, user roles, and admin-only access control.

## Features Implemented

### 1. Backend Authentication Routes (`/server/routes/auth.js`)
- **POST /api/auth/signup** - Create new user account (default role: 'user')
- **POST /api/auth/login** - Login and receive JWT token
- **GET /api/auth/verify** - Verify JWT token and get user info

### 2. JWT Authentication Middleware (`/server/middleware/auth.js`)
- `generateToken()` - Creates JWT tokens with user info and 24h expiration
- `verifyToken()` - Middleware to verify JWT tokens from Authorization header
- `requireAdmin()` - Middleware to ensure user has admin role

### 3. User Database (`/server/db/users.js`)
- File-based user storage in `users.json`
- Automatic creation of admin user on first run:
  - Username: `admin`
  - Password: `admin123`
- Password hashing with bcryptjs
- User roles: 'admin' or 'user'

### 4. Project Directory Structure Update
- Changed from `/user-projects/{projectName}` to `/user-projects/{username}-{projectName}`
- All project routes now require admin authentication
- Project names automatically include username prefix

### 5. Frontend Authentication
- **AuthContext** (`/src/contexts/AuthContext.tsx`) - Global auth state management
- **Login Page** (`/src/pages/Login.tsx`) - User login with admin hint
- **Signup Page** (`/src/pages/Signup.tsx`) - User registration
- **ProtectedRoute** (`/src/components/ProtectedRoute.tsx`) - Route protection component

### 6. IDE Updates
- Added authentication headers to all API calls
- User info display in header
- Logout functionality
- Access denied page for non-admin users

## Security Features
- JWT tokens stored in localStorage
- All project operations require admin role
- Passwords hashed with bcrypt
- Token verification on protected routes
- 24-hour token expiration

## Usage

### Starting the Application
```bash
npm install
npm run dev
```

### Login Flow
1. User visits the site and clicks "Start Coding"
2. Redirected to login page
3. Can login with admin credentials or create new account
4. Only admin users can access the IDE
5. Non-admin users see "Access Denied" message

### Admin Credentials
- Username: `admin`
- Password: `admin123`

## API Authentication
All protected endpoints require the Authorization header:
```
Authorization: Bearer <JWT_TOKEN>
```

## File Structure
```
server/
  middleware/
    auth.js         # JWT authentication middleware
  db/
    users.js        # User database management
    users.json      # User data (gitignored)
  routes/
    auth.js         # Authentication routes
    project.js      # Updated with auth requirements

src/
  contexts/
    AuthContext.tsx # Global auth state
  components/
    ProtectedRoute.tsx # Route protection
  pages/
    Login.tsx       # Login page
    Signup.tsx      # Signup page
    IDE.tsx         # Updated with auth
```