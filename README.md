# React Web IDE

A browser-based React IDE with AI-powered code assistance, similar to v0.dev. Build, test, and deploy React applications directly in your browser with real-time preview and intelligent code modifications.

## 🌟 Features

### Core IDE Functionality
- **Monaco Editor** - Full-featured code editor with syntax highlighting and IntelliSense
- **Real-time Preview** - See your changes instantly with hot reload (1s debounce)
- **Browser-based Compilation** - TypeScript/JSX compilation using esbuild-wasm
- **Virtual File System** - Create, edit, and organize files with a hierarchical file tree
- **Project Templates** - Start with pre-configured React + TypeScript + Vite setup

### AI Integration
- **Claude 3.5 Haiku** - Powered by Anthropic's latest AI model
- **Autonomous File Operations** - AI can create, modify, and delete files
- **Error Assistance** - "Ask AI for help" button for debugging support
- **Terminal Commands** - AI can execute terminal commands (security restricted for users)
- **XML Tool Use** - Advanced AI capabilities for more autonomous operations

### Security & Authentication
- **JWT Authentication** - Secure token-based authentication (24-hour validity)
- **Role-based Access** - Admin and user role separation
- **Isolated Projects** - Each user's projects are isolated in separate directories
- **Secure Terminal** - Only AI can execute commands, preventing security risks

## 🚀 Getting Started

### Prerequisites
- Node.js 16+ 
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/PragcodeDev.git
cd PragcodeDev
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory:
```env
ANTHROPIC_API_KEY=your_anthropic_api_key_here
PORT=3001
JWT_SECRET=your_jwt_secret_here
```

4. Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:5173` (frontend) and API at `http://localhost:3001`.

### Default Admin Account
- **Username**: `admin`
- **Password**: `admin123`

⚠️ **Important**: Change the default admin credentials in production!

## 📁 Project Structure

```
PragcodeDev/
├── src/                    # Frontend source code
│   ├── pages/             # Page components
│   │   ├── IDE.tsx        # Main IDE component
│   │   ├── Login.tsx      # Login page
│   │   └── Signup.tsx     # Signup page
│   ├── contexts/          # React contexts
│   │   └── AuthContext.tsx # Authentication state
│   └── components/        # Reusable components
│       └── ProtectedRoute.tsx
├── server/                # Backend source code
│   ├── routes/           # API routes
│   │   ├── auth.js       # Authentication endpoints
│   │   ├── chat.js       # AI chat endpoints
│   │   └── project.js    # Project management
│   ├── middleware/       # Express middleware
│   │   └── auth.js       # JWT verification
│   └── prompts/          # AI system prompts
│       └── system-prompt.md
├── user-projects/        # User project storage (gitignored)
└── server/data/          # User data storage (gitignored)
```

## 🛠️ Technology Stack

- **Frontend**
  - React 18 with TypeScript
  - Monaco Editor for code editing
  - React Router for navigation
  - esbuild-wasm for browser compilation
  - Custom CSS for styling

- **Backend**
  - Express.js server
  - JWT for authentication
  - bcrypt for password hashing
  - Anthropic Claude SDK for AI

## 🔒 Security Features

- Password hashing with bcrypt
- JWT token authentication
- Project isolation per user
- Path validation to prevent directory traversal
- AI-only terminal access
- Input sanitization

## 🎯 Usage

1. **Login** with admin credentials
2. **Create a new project** by entering a project name
3. **Edit files** using the Monaco editor
4. **See live preview** in the right panel
5. **Chat with AI** for code assistance
6. **Let AI modify code** autonomously

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Inspired by [a0.dev](https://a0.dev)
- Built with [Monaco Editor](https://microsoft.github.io/monaco-editor/)
- Powered by [Anthropic Claude](https://www.anthropic.com/)
- Uses [esbuild](https://esbuild.github.io/) for compilation

## ⚡ Future Enhancements

- [ ] Multiple project management
- [ ] More project templates (Vue, Angular, etc.)
- [ ] File upload/download functionality
- [ ] Git integration
- [ ] Collaborative editing
- [ ] Deploy to cloud providers
- [ ] Extended language support
- [ ] Plugin system

## 🐛 Known Issues

- Terminal is restricted to AI-only access for security
- Large projects may experience slower compilation
- Preview refresh has a 1-second debounce

## 📧 Contact

For questions or support, please open an issue on GitHub.

---

Made with ❤️ by developers, for developers
