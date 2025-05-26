import { useState, useEffect, useRef } from 'react'
import Editor from '@monaco-editor/react'
import { MessageSquare, Send, Bot, User, X, Lightbulb, Bug, TestTube, Code, Plus, Trash2, FileText, Folder, Terminal } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import './IDE.css'

interface FileNode {
  name: string
  content: string
  language: string
}

interface FileTreeNode {
  name: string
  path: string
  type: 'file' | 'folder'
  children?: FileTreeNode[]
  isExpanded?: boolean
}

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

interface FileOperation {
  action: 'create' | 'update' | 'delete'
  fileName: string
  content?: string
}

interface Project {
  fullName: string
  displayName: string
  path: string
  description?: string
  lastModified?: Date
  created?: Date
}

// Dynamic import for esbuild-wasm
let esbuildInstance: any = null

function IDE() {
  const { user, token } = useAuth()
  
  // Check if we should clear session (new session)
  const urlParams = new URLSearchParams(window.location.search)
  const shouldClearSession = urlParams.get('new') === 'true'
  
  // Project state - Initialize from sessionStorage only if not a new session
  const [projectName, setProjectName] = useState<string>(() => {
    if (shouldClearSession) {
      sessionStorage.removeItem('projectName')
      sessionStorage.removeItem('isProjectInitialized')
      return ''
    }
    return sessionStorage.getItem('projectName') || ''
  })
  const [isProjectInitialized, setIsProjectInitialized] = useState(() => {
    if (shouldClearSession) {
      return false
    }
    return sessionStorage.getItem('isProjectInitialized') === 'true'
  })
  const [showProjectSetup, setShowProjectSetup] = useState(() => {
    if (shouldClearSession) {
      return true
    }
    return sessionStorage.getItem('isProjectInitialized') !== 'true'
  })
  const [isInitializing, setIsInitializing] = useState(false)
  
  // Project selection state
  const [projectMode, setProjectMode] = useState<'select' | 'create' | null>(null)
  const [existingProjects, setExistingProjects] = useState<Project[]>([])
  const [isLoadingProjects, setIsLoadingProjects] = useState(false)
  const [selectedProject, setSelectedProject] = useState<string | null>(null)
  
  const [files, setFiles] = useState<Record<string, FileNode>>({})
  const [fileTree, setFileTree] = useState<FileTreeNode[]>([])
  
  const [activeFile, setActiveFile] = useState<string | null>(null)
  const [output, setOutput] = useState('')
  const [isBuilding, setIsBuilding] = useState(false)
  const [isEsbuildReady, setIsEsbuildReady] = useState(false)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  
  // Chat state
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)
  
  // File management state
  const [showNewFileDialog, setShowNewFileDialog] = useState(false)
  const [newFileName, setNewFileName] = useState('')
  const [fileToDelete, setFileToDelete] = useState<string | null>(null)
  
  // Terminal state
  const [showTerminal, setShowTerminal] = useState(false)
  const [terminalOutput, setTerminalOutput] = useState<string[]>([])
  const [terminalInput, setTerminalInput] = useState('')
  const [isTerminalLoading, setIsTerminalLoading] = useState(false)
  const terminalEndRef = useRef<HTMLDivElement>(null)
  
  // Initialize project with React Vite setup
  const initializeProject = async (name: string) => {
    setIsInitializing(true)
    try {
      // Create project
      const response = await fetch('/api/project/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ projectName: name })
      })
      
      if (!response.ok) {
        throw new Error('Failed to create project')
      }
      
      const data = await response.json()
      
      // Use the project name from the response (includes username prefix)
      const actualProjectName = data.projectName
      
      // Create React Vite template files
      const templateFiles = {
        'src/App.tsx': {
          name: 'App.tsx',
          content: `import React from 'react'
import './App.css'

function App() {
  return (
    <div className="App">
      <h1>Welcome to ${name}!</h1>
      <p>Start editing to see your changes.</p>
    </div>
  )
}

export default App`,
          language: 'typescript'
        },
        'src/main.tsx': {
          name: 'main.tsx',
          content: `import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)`,
          language: 'typescript'
        },
        'src/App.css': {
          name: 'App.css',
          content: `.App {
  max-width: 1280px;
  margin: 0 auto;
  padding: 2rem;
  text-align: center;
}

h1 {
  font-size: 3.2em;
  line-height: 1.1;
  color: #646cff;
}

p {
  color: #888;
}`,
          language: 'css'
        },
        'src/index.css': {
          name: 'index.css',
          content: `:root {
  font-family: Inter, system-ui, Avenir, Helvetica, Arial, sans-serif;
  line-height: 1.5;
  font-weight: 400;

  color-scheme: light dark;
  color: rgba(255, 255, 255, 0.87);
  background-color: #242424;

  font-synthesis: none;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

body {
  margin: 0;
  display: flex;
  place-items: center;
  min-width: 320px;
  min-height: 100vh;
}

h1 {
  font-size: 3.2em;
  line-height: 1.1;
}

@media (prefers-color-scheme: light) {
  :root {
    color: #213547;
    background-color: #ffffff;
  }
}`,
          language: 'css'
        },
        'index.html': {
          name: 'index.html',
          content: `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${name}</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>`,
          language: 'html'
        }
      }
      
      // Set files in state with leading slashes for internal consistency
      const filesWithSlashes: Record<string, FileNode> = {}
      for (const [path, file] of Object.entries(templateFiles)) {
        filesWithSlashes[`/${path}`] = file
      }
      setFiles(filesWithSlashes)
      
      // Save all template files to project using the name parameter directly
      for (const [path, file] of Object.entries(templateFiles)) {
        await fetch('/api/project/save-file', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            projectName: actualProjectName,  // Use the actual project name with username prefix
            filePath: path,  // Path already without leading slash
            content: file.content
          })
        })
      }
      
      setProjectName(actualProjectName)
      setIsProjectInitialized(true)
      setShowProjectSetup(false)
      
      // Save to sessionStorage
      sessionStorage.setItem('projectName', actualProjectName)
      sessionStorage.setItem('isProjectInitialized', 'true')
      
      // Load file tree with the new project name
      await loadProjectFiles(actualProjectName)
      
      // Set initial active file
      setActiveFile('/src/App.tsx')
      
      setTerminalOutput([`Project "${data.originalName}" initialized successfully!`])
    } catch (error) {
      console.error('Failed to initialize project:', error)
      alert('Failed to initialize project. Please try again.')
    } finally {
      setIsInitializing(false)
    }
  }
  
  // Save file to project directory
  const saveFileToProject = async (filePath: string, content: string) => {
    try {
      const cleanPath = filePath.startsWith('/') ? filePath.substring(1) : filePath
      
      await fetch('/api/project/save-file', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          projectName,
          filePath: cleanPath,
          content
        })
      })
    } catch (error) {
      console.error('Failed to save file:', error)
    }
  }
  
  // Load all project files
  const loadProjectFiles = async (nameParam?: string) => {
    const name = nameParam || projectName
    if (!name) return
    
    try {
      const response = await fetch(`/api/project/files/${name}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      if (!response.ok) {
        throw new Error('Failed to load project files')
      }
      
      const data = await response.json()
      if (data.success && data.files) {
        // Convert flat file list to FileNode format
        const newFiles: Record<string, FileNode> = {}
        
        for (const [path, content] of Object.entries(data.files)) {
          const name = path.split('/').pop() || path
          const ext = name.split('.').pop()?.toLowerCase()
          
          let language = 'plaintext'
          switch (ext) {
            case 'ts':
            case 'tsx':
              language = 'typescript'
              break
            case 'js':
            case 'jsx':
              language = 'javascript'
              break
            case 'css':
              language = 'css'
              break
            case 'json':
              language = 'json'
              break
            case 'md':
              language = 'markdown'
              break
            case 'html':
              language = 'html'
              break
          }
          
          newFiles[`/${path}`] = {
            name,
            content: content as string,
            language
          }
        }
        
        setFiles(newFiles)
        
        // Build file tree
        const tree = buildFileTree(Object.keys(newFiles))
        setFileTree(tree)
      }
    } catch (error) {
      console.error('Failed to load project files:', error)
    }
  }
  
  // Build hierarchical file tree from flat file paths
  const buildFileTree = (paths: string[]): FileTreeNode[] => {
    const root: FileTreeNode[] = []
    
    paths.forEach(path => {
      const parts = path.split('/').filter(p => p)
      let currentLevel = root
      
      parts.forEach((part, index) => {
        const isFile = index === parts.length - 1
        const currentPath = '/' + parts.slice(0, index + 1).join('/')
        
        let existing = currentLevel.find(item => item.name === part)
        
        if (!existing) {
          existing = {
            name: part,
            path: currentPath,
            type: isFile ? 'file' : 'folder',
            children: isFile ? undefined : [],
            isExpanded: true
          }
          currentLevel.push(existing)
        }
        
        if (!isFile && existing.children) {
          currentLevel = existing.children
        }
      })
    })
    
    return root
  }
  
  // Load existing projects
  const loadExistingProjects = async () => {
    setIsLoadingProjects(true)
    try {
      const response = await fetch('/api/project/list', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (!response.ok) {
        throw new Error('Failed to load projects')
      }
      
      const data = await response.json()
      if (data.success && data.projects) {
        setExistingProjects(data.projects)
      }
    } catch (error) {
      console.error('Failed to load projects:', error)
      setExistingProjects([])
    } finally {
      setIsLoadingProjects(false)
    }
  }
  
  // Load existing project
  const loadExistingProject = async (projectFullName: string) => {
    setIsInitializing(true)
    try {
      // Set project name and mark as initialized
      setProjectName(projectFullName)
      setIsProjectInitialized(true)
      setShowProjectSetup(false)
      
      // Save to sessionStorage
      sessionStorage.setItem('projectName', projectFullName)
      sessionStorage.setItem('isProjectInitialized', 'true')
      
      // Load project files
      await loadProjectFiles(projectFullName)
      
      // Set initial active file
      setActiveFile('/src/App.tsx')
      
      setTerminalOutput([`Project "${projectFullName}" loaded successfully!`])
    } catch (error) {
      console.error('Failed to load project:', error)
      alert('Failed to load project. Please try again.')
    } finally {
      setIsInitializing(false)
    }
  }
  
  // Toggle folder expansion
  const toggleFolder = (path: string) => {
    setFileTree(prevTree => {
      const newTree = JSON.parse(JSON.stringify(prevTree))
      
      const findAndToggle = (nodes: FileTreeNode[]) => {
        for (const node of nodes) {
          if (node.path === path && node.type === 'folder') {
            node.isExpanded = !node.isExpanded
            return
          }
          if (node.children) {
            findAndToggle(node.children)
          }
        }
      }
      
      findAndToggle(newTree)
      return newTree
    })
  }

  useEffect(() => {
    const loadEsbuild = async () => {
      try {
        // Try to access esbuild-wasm from window after dynamic script load
        const script = document.createElement('script')
        script.src = 'https://unpkg.com/esbuild-wasm@0.19.11/lib/browser.min.js'
        
        await new Promise((resolve, reject) => {
          script.onload = resolve
          script.onerror = reject
          document.head.appendChild(script)
        })
        
        // esbuild should now be available on window
        const esbuild = (window as any).esbuild
        if (!esbuild) {
          throw new Error('esbuild not found on window')
        }
        
        await esbuild.initialize({
          wasmURL: 'https://unpkg.com/esbuild-wasm@0.19.11/esbuild.wasm'
        })
        
        esbuildInstance = esbuild
        setIsEsbuildReady(true)
        console.log('esbuild initialized successfully')
      } catch (error) {
        console.error('Failed to initialize esbuild:', error)
      }
    }
    
    loadEsbuild()
  }, [])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])
  
  // Listen for runtime errors from preview iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'runtime-error' && event.data.error) {
        const error = event.data.error
        const errorMessage = `Runtime error: ${error.message}${error.stack ? '\n\nStack trace:\n' + error.stack : ''}`
        setOutput(errorMessage)
      }
    }
    
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [])
  
  // Load project files when initialized
  useEffect(() => {
    if (isProjectInitialized && projectName) {
      loadProjectFiles()
      // Trigger initial build after files are loaded
      setTimeout(() => {
        buildAndPreview()
      }, 500)
    }
  }, [isProjectInitialized, projectName])

  // Auto-preview debounce timer
  const previewTimerRef = useRef<ReturnType<typeof setTimeout>>()
  
  const handleEditorChange = (value: string | undefined) => {
    if (value !== undefined && activeFile) {
      setFiles(prev => ({
        ...prev,
        [activeFile]: {
          ...prev[activeFile],
          content: value
        }
      }))
      
      // Save to project if initialized
      if (isProjectInitialized) {
        saveFileToProject(activeFile, value)
      }
      
      // Auto-preview with debounce
      if (previewTimerRef.current) {
        clearTimeout(previewTimerRef.current)
      }
      previewTimerRef.current = setTimeout(() => {
        buildAndPreview()
      }, 1000) // 1 second delay
    }
  }

  const buildAndPreview = async () => {
    if (!isEsbuildReady || !esbuildInstance) {
      console.error('esbuild not initialized')
      return
    }

    setIsBuilding(true)
    try {
      // Transform user code first
      const transformedFiles: Record<string, string> = {}
      
      for (const [path, file] of Object.entries(files)) {
        if (file.content.includes('import React')) {
          // Replace React imports with global access
          transformedFiles[path] = file.content
            .replace(/import\s+React\s+from\s+['"]react['"]/g, 'const React = window.React')
            .replace(/import\s+ReactDOM\s+from\s+['"]react-dom\/client['"]/g, 'const ReactDOM = window.ReactDOM')
            .replace(/import\s+\*\s+as\s+React\s+from\s+['"]react['"]/g, 'const React = window.React')
        } else {
          transformedFiles[path] = file.content
        }
      }

      // Use main.tsx as entry point
      const entryContent = transformedFiles['/src/main.tsx']
      if (!entryContent) {
        setOutput('Error: main.tsx not found')
        return
      }
      
      const result = await esbuildInstance.build({
        stdin: {
          contents: entryContent,
          loader: 'tsx',
          resolveDir: '/src'
        },
        bundle: true,
        write: false,
        format: 'iife',
        plugins: [
          {
            name: 'virtual-fs',
            setup(build: any) {
              // Handle npm packages
              build.onResolve({ filter: /^[^./]/ }, (args: any) => {
                // Skip React and ReactDOM (already loaded via UMD)
                if (args.path === 'react' || args.path === 'react-dom') {
                  return { 
                    path: args.path,
                    namespace: 'react-stub' 
                  }
                }
                
                // For other packages, we'll create a stub that loads from CDN
                return { 
                  path: args.path,
                  namespace: 'npm-stub' 
                }
              })
              
              // Load npm packages from CDN
              build.onLoad({ filter: /.*/, namespace: 'npm-stub' }, async (args: any) => {
                const packageName = args.path
                
                // Map common packages to their global names
                const packageMappings: Record<string, string> = {
                  'react-router-dom': 'ReactRouterDOM',
                  'axios': 'axios',
                  'styled-components': 'styled',
                  '@emotion/react': 'emotionReact',
                  '@emotion/styled': 'emotionStyled'
                }
                
                const globalName = packageMappings[packageName]
                
                if (globalName) {
                  // Return code that uses the global variable
                  return {
                    contents: `
                      if (!window.${globalName}) {
                        throw new Error('Package "${packageName}" is not loaded. Add it to index.html via CDN.');
                      }
                      export default window.${globalName};
                      export * from window.${globalName};
                    `,
                    loader: 'js'
                  }
                }
                
                // For unknown packages
                return {
                  contents: `
                    throw new Error('Package "${packageName}" is not available. Please check if it has a UMD build or use vanilla React patterns.');
                  `,
                  loader: 'js'
                }
              })
              
              // Stub for React/ReactDOM to use global variables
              build.onLoad({ filter: /.*/, namespace: 'react-stub' }, (args: any) => {
                if (args.path === 'react') {
                  return { 
                    contents: `
                      const React = window.React;
                      export default React;
                      export const Fragment = React.Fragment;
                      export const Component = React.Component;
                      export const PureComponent = React.PureComponent;
                      export const createElement = React.createElement;
                      export const cloneElement = React.cloneElement;
                      export const createContext = React.createContext;
                      export const forwardRef = React.forwardRef;
                      export const lazy = React.lazy;
                      export const memo = React.memo;
                      export const useCallback = React.useCallback;
                      export const useContext = React.useContext;
                      export const useEffect = React.useEffect;
                      export const useImperativeHandle = React.useImperativeHandle;
                      export const useDebugValue = React.useDebugValue;
                      export const useLayoutEffect = React.useLayoutEffect;
                      export const useMemo = React.useMemo;
                      export const useReducer = React.useReducer;
                      export const useRef = React.useRef;
                      export const useState = React.useState;
                      export const useDeferredValue = React.useDeferredValue;
                      export const useTransition = React.useTransition;
                      export const useSyncExternalStore = React.useSyncExternalStore;
                      export const useInsertionEffect = React.useInsertionEffect;
                      export const useId = React.useId;
                      export const version = React.version;
                      export const StrictMode = React.StrictMode;
                      export const Suspense = React.Suspense;
                      export const Profiler = React.Profiler;
                    `, 
                    loader: 'js' 
                  }
                }
                if (args.path === 'react-dom') {
                  return { 
                    contents: `
                      const ReactDOM = window.ReactDOM;
                      export default ReactDOM;
                      export const render = ReactDOM.render;
                      export const hydrate = ReactDOM.hydrate;
                      export const unmountComponentAtNode = ReactDOM.unmountComponentAtNode;
                      export const findDOMNode = ReactDOM.findDOMNode;
                      export const createPortal = ReactDOM.createPortal;
                      export const flushSync = ReactDOM.flushSync;
                      export const unstable_batchedUpdates = ReactDOM.unstable_batchedUpdates;
                      export const version = ReactDOM.version;
                      export const createRoot = ReactDOM.createRoot;
                      export const hydrateRoot = ReactDOM.hydrateRoot;
                    `, 
                    loader: 'js' 
                  }
                }
                return { contents: '', loader: 'js' }
              })
              
              // Handle relative imports
              build.onResolve({ filter: /^\./ }, (args: any) => {
                // Check if it's a CSS file
                if (args.path.endsWith('.css')) {
                  return { 
                    path: args.path,
                    namespace: 'css-stub' 
                  }
                }
                return { 
                  path: `/src/${args.path.slice(2)}`,
                  namespace: 'virtual-fs' 
                }
              })
              
              // Handle CSS imports
              build.onResolve({ filter: /\.css$/ }, () => {
                return { 
                  path: 'stub',
                  namespace: 'css-stub' 
                }
              })
              
              build.onLoad({ filter: /.*/, namespace: 'css-stub' }, () => {
                return { contents: '', loader: 'js' }
              })

              build.onLoad({ filter: /.*/, namespace: 'virtual-fs' }, (args: any) => {
                // Skip CSS files
                if (args.path.endsWith('.css')) {
                  return { contents: '', loader: 'js' }
                }
                
                const file = transformedFiles[args.path] || transformedFiles[`${args.path}.tsx`] || transformedFiles[`${args.path}.ts`]
                
                if (file) {
                  return {
                    contents: file,
                    loader: 'tsx'
                  }
                }
                return { contents: '', loader: 'tsx' }
              })
            }
          }
        ],
        jsx: 'transform',
        jsxFactory: 'React.createElement',
        jsxFragment: 'React.Fragment'
      })

      const code = result.outputFiles[0].text
      
      // Combine all CSS files
      let combinedCSS = ''
      if (files['/src/index.css']) {
        combinedCSS += files['/src/index.css'].content + '\n'
      }
      if (files['/src/App.css']) {
        combinedCSS += files['/src/App.css'].content + '\n'
      }
      
      const html = `
        <!DOCTYPE html>
        <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Preview</title>
            <style>
              ${combinedCSS}
            </style>
            <script crossorigin src="https://unpkg.com/react@18/umd/react.development.js"></script>
            <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
            
            <!-- Load common libraries via CDN -->
            <script crossorigin src="https://unpkg.com/react-router-dom@6/dist/umd/react-router-dom.development.js"></script>
            <script crossorigin src="https://unpkg.com/axios/dist/axios.min.js"></script>
            
            <script>
              // Ensure React and ReactDOM are available globally
              window.addEventListener('DOMContentLoaded', function() {
                if (!window.React || !window.ReactDOM) {
                  console.error('React or ReactDOM not loaded');
                }
              });
            </script>
          </head>
          <body>
            <div id="root"></div>
            <script>
              // Send runtime errors to parent window
              window.addEventListener('error', function(event) {
                parent.postMessage({
                  type: 'runtime-error',
                  error: {
                    message: event.message,
                    filename: event.filename,
                    lineno: event.lineno,
                    colno: event.colno,
                    stack: event.error ? event.error.stack : ''
                  }
                }, '*');
              });
              
              try {
                (function() {
                  ${code}
                })();
              } catch (error) {
                console.error('Runtime error:', error);
                document.getElementById('root').innerHTML = '<div style="color: red; padding: 20px;">Error: ' + error.message + '</div>';
                parent.postMessage({
                  type: 'runtime-error',
                  error: {
                    message: error.message,
                    stack: error.stack
                  }
                }, '*');
              }
            </script>
          </body>
        </html>
      `
      
      if (iframeRef.current) {
        const blob = new Blob([html], { type: 'text/html' })
        iframeRef.current.src = URL.createObjectURL(blob)
      }
      
      setOutput('Build successful!')
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      // Make error messages more readable
      const formattedError = errorMessage
        .replace(/\n/g, '\n  ')  // Indent multi-line errors
        .replace(/Build failed with \d+ error/, 'Build failed')
      
      setOutput(`Build error:\n  ${formattedError}`)
      console.error('Build error:', error)
    } finally {
      setIsBuilding(false)
    }
  }

  const createNewFile = async () => {
    if (!newFileName.trim()) return
    
    const fileName = newFileName.endsWith('.tsx') || newFileName.endsWith('.ts') 
      ? newFileName 
      : `${newFileName}.tsx`
    
    const filePath = `/src/${fileName}`
    
    if (files[filePath]) {
      alert('File already exists!')
      return
    }
    
    const newFile: FileNode = {
      name: fileName,
      content: `// ${fileName}\n\nexport default function Component() {\n  return (\n    <div>\n      <h1>New Component</h1>\n    </div>\n  )\n}`,
      language: 'typescript'
    }
    
    setFiles(prev => ({
      ...prev,
      [filePath]: newFile
    }))
    
    // Save to project if initialized
    if (isProjectInitialized) {
      await saveFileToProject(filePath, newFile.content)
    }
    
    setActiveFile(filePath)
    setNewFileName('')
    setShowNewFileDialog(false)
    
    // Notify AI about the new file
    const notificationMessage: Message = {
      id: Date.now().toString(),
      role: 'assistant',
      content: `Created new file: ${fileName}`,
      timestamp: new Date()
    }
    setMessages(prev => [...prev, notificationMessage])
  }
  
  const deleteFile = (filePath: string) => {
    if (Object.keys(files).length <= 1) {
      alert('Cannot delete the last file!')
      return
    }
    
    const newFiles = { ...files }
    delete newFiles[filePath]
    setFiles(newFiles)
    
    // Switch to another file if the deleted one was active
    if (activeFile === filePath) {
      const remainingFiles = Object.keys(newFiles)
      setActiveFile(remainingFiles[0])
    }
    
    setFileToDelete(null)
    
    // Notify AI about the deletion
    const notificationMessage: Message = {
      id: Date.now().toString(),
      role: 'assistant',
      content: `Deleted file: ${files[filePath].name}`,
      timestamp: new Date()
    }
    setMessages(prev => [...prev, notificationMessage])
  }

  const analyzeCode = async (action: string) => {
    if (!activeFile) {
      alert('Please select or create a file first')
      return
    }
    
    setIsLoading(true)
    
    try {
      const response = await fetch('/api/chat/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: files[activeFile]?.content || '',
          action: action
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to analyze code')
      }

      const data = await response.json()
      
      // Add the analysis result to the chat
      const analysisMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: data.content,
        timestamp: new Date()
      }

      setMessages(prev => [...prev, analysisMessage])
      setIsChatOpen(true)
      
    } catch (error) {
      console.error('Error analyzing code:', error)
      const errorMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `Error: ${error instanceof Error ? error.message : 'Failed to analyze code'}`,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
      setIsChatOpen(true)
    } finally {
      setIsLoading(false)
    }
  }

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return

    const newMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputMessage,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, newMessage])
    setInputMessage('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [...messages, newMessage],
          currentCode: activeFile ? files[activeFile]?.content : '',
          fileName: activeFile || 'No file selected',
          projectName: projectName
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to get response')
      }

      const data = await response.json()
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.content,
        timestamp: new Date()
      }

      setMessages(prev => [...prev, assistantMessage])

      // If the AI suggests code changes, apply them directly
      if (data.suggestedCode && activeFile) {
        setFiles(prev => ({
          ...prev,
          [activeFile]: {
            ...prev[activeFile],
            content: data.suggestedCode
          }
        }))
      }
      
      // Handle file operations (now supports multiple operations)
      if (data.fileOperations && data.fileOperations.length > 0) {
        const operations = data.fileOperations
        
        // Apply all operations directly without confirmation
        operations.forEach((op: FileOperation) => {
            const { action, fileName, content } = op
            // Always use the path as provided by AI, with leading slash
            const filePath = fileName.startsWith('/') ? fileName : `/${fileName}`
            const name = filePath.split('/').pop() || fileName
            
            // Determine language based on file extension
            const getLanguage = (filename: string) => {
              const ext = filename.split('.').pop()?.toLowerCase()
              switch (ext) {
                case 'ts':
                case 'tsx':
                  return 'typescript'
                case 'js':
                case 'jsx':
                  return 'javascript'
                case 'css':
                  return 'css'
                case 'json':
                  return 'json'
                case 'md':
                  return 'markdown'
                default:
                  return 'plaintext'
              }
            }
            
            if (action === 'create' && fileName && content) {
              const newFile: FileNode = {
                name: name,
                content: content,
                language: getLanguage(name)
              }
              setFiles(prev => ({
                ...prev,
                [filePath]: newFile
              }))
              
              // Save to project directory
              if (isProjectInitialized) {
                saveFileToProject(filePath, content)
              }
              
              // Set active file to the first created file
              if (operations.indexOf(op) === 0 && action === 'create') {
                setActiveFile(filePath)
              }
            } else if (action === 'update' && fileName && content) {
              // Try multiple path variations to find the file
              const possiblePaths = [
                filePath,
                fileName,
                `/${fileName}`,
                fileName.startsWith('/') ? fileName.substring(1) : `/${fileName}`,
                fileName.startsWith('src/') ? `/${fileName}` : fileName,
                !fileName.startsWith('/') && !fileName.startsWith('src/') ? `/src/${fileName}` : fileName
              ]
              
              // Find the first matching path in our files
              const existingPath = possiblePaths.find(p => files[p])
              
              if (existingPath) {
                console.log(`Updating file: ${existingPath}`)
                setFiles(prev => ({
                  ...prev,
                  [existingPath]: {
                    ...prev[existingPath],
                    content: content
                  }
                }))
                
                // Save to project directory
                if (isProjectInitialized) {
                  saveFileToProject(existingPath, content)
                }
              } else {
                // If file doesn't exist, create it instead
                console.log(`File not found for update, creating: ${filePath}`)
                const newFile: FileNode = {
                  name: name,
                  content: content,
                  language: getLanguage(name)
                }
                setFiles(prev => ({
                  ...prev,
                  [filePath]: newFile
                }))
                
                // Save to project directory
                if (isProjectInitialized) {
                  saveFileToProject(filePath, content)
                }
              }
            } else if (action === 'delete' && fileName) {
              // Try both with and without /src/ prefix
              const possiblePaths = [filePath, fileName]
              const existingPath = possiblePaths.find(p => files[p])
              
              if (existingPath) {
                deleteFile(existingPath)
              }
            }
          })
          
      // Reload file tree after operations
      setTimeout(() => {
        console.log('Reloading project files after AI operation...')
        loadProjectFiles()
      }, 500)
      }
      
      // Handle terminal commands from AI
      if (data.terminalCommands && data.terminalCommands.length > 0) {
        // Initialize project if not already done
        if (!isProjectInitialized) {
          // Cannot initialize project from here as we don't have a project name
          setTerminalOutput(prev => [...prev, 'Error: No project initialized. Please refresh the page to create a project.'])
          return
        }
        
        // Open terminal if not already open
        if (!showTerminal) {
          setShowTerminal(true)
        }
        
        // Execute each command
        for (const command of data.terminalCommands) {
          setTerminalOutput(prev => [...prev, `$ ${command} (executed by AI)`])
          
          try {
            const cmdResponse = await fetch('/api/project/terminal', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({ 
                projectName,
                command,
                isFromAI: true 
              })
            })
            
            const cmdData = await cmdResponse.json()
            
            if (!cmdResponse.ok) {
              setTerminalOutput(prev => [...prev, `Error: ${cmdData.message || 'Command failed'}`])
            } else {
              const output = cmdData.output.split('\n').filter((line: string) => line.trim())
              setTerminalOutput(prev => [...prev, ...output])
            }
          } catch {
            setTerminalOutput(prev => [...prev, `Error: Failed to execute command`])
          }
        }
      }
    } catch (error) {
      console.error('Error sending message:', error)
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Error: ${error instanceof Error ? error.message : 'Failed to connect to AI service. Please check if the server is running.'}`,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }
  
  const executeCommand = async () => {
    if (!terminalInput.trim() || isTerminalLoading) return
    
    // Users cannot execute terminal commands
    setTerminalOutput(prev => [...prev, `$ ${terminalInput.trim()}`])
    setTerminalOutput(prev => [...prev, `Error: Terminal access is restricted. Only AI can execute commands.`])
    setTerminalOutput(prev => [...prev, `Please ask the AI assistant to run commands for you.`])
    setTerminalInput('')
  }
  
  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [terminalOutput])
  
  // File tree component
  const FileTreeView = () => {
    const renderTree = (nodes: FileTreeNode[], level = 0) => {
      return nodes.map(node => (
        <div key={node.path}>
          <div
            className={`file-tree-item ${node.type === 'file' && activeFile === node.path ? 'active' : ''}`}
            style={{ paddingLeft: `${level * 16 + 8}px` }}
            onClick={() => {
              if (node.type === 'file') {
                setActiveFile(node.path)
              } else {
                toggleFolder(node.path)
              }
            }}
          >
            <div className="file-tree-item-content">
              {node.type === 'folder' ? (
                <>
                  <span className="folder-icon">
                    {node.isExpanded ? '▼' : '▶'}
                  </span>
                  <Folder size={14} />
                </>
              ) : (
                <FileText size={14} />
              )}
              <span className="file-tree-name">{node.name}</span>
            </div>
            {node.type === 'file' && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setFileToDelete(node.path)
                }}
                className="delete-file-button"
                title="Delete file"
              >
                <Trash2 size={12} />
              </button>
            )}
          </div>
          {node.type === 'folder' && node.isExpanded && node.children && (
            <div className="file-tree-children">
              {renderTree(node.children, level + 1)}
            </div>
          )}
        </div>
      ))
    }
    
    return <div className="file-tree">{renderTree(fileTree)}</div>
  }

  return (
    <>
      {/* Project Setup Overlay */}
      {showProjectSetup && (
        <div className="project-setup-overlay">
          <div className="project-setup-container">
            {projectMode === null ? (
              <>
                <h1>Welcome to React Web IDE</h1>
                <p>Choose how to get started</p>
                
                <div className="project-mode-buttons">
                  <button
                    onClick={() => setProjectMode('create')}
                    className="mode-button create-mode"
                  >
                    <Plus size={24} />
                    <span>Create New Project</span>
                  </button>
                  
                  <button
                    onClick={() => {
                      setProjectMode('select')
                      loadExistingProjects()
                    }}
                    className="mode-button select-mode"
                  >
                    <Folder size={24} />
                    <span>Open Existing Project</span>
                  </button>
                </div>
              </>
            ) : projectMode === 'create' ? (
              <>
                <h1>Create New React Project</h1>
                <p>Enter a name for your project to get started</p>
                
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => {
                    // Allow alphanumeric, hyphens, and underscores
                    const filtered = e.target.value.replace(/[^a-zA-Z0-9-_]/g, '')
                    setProjectName(filtered)
                  }}
                  placeholder="my-awesome-app"
                  className="project-name-input"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && projectName.trim()) {
                      initializeProject(projectName.trim())
                    }
                  }}
                />
                
                <div className="project-actions">
                  <button
                    onClick={() => setProjectMode(null)}
                    className="back-button"
                  >
                    Back
                  </button>
                  <button
                    onClick={() => initializeProject(projectName.trim())}
                    disabled={!projectName.trim() || isInitializing}
                    className="create-project-button"
                  >
                    {isInitializing ? 'Creating Project...' : 'Create Project'}
                  </button>
                </div>
                
                {isInitializing && (
                  <div className="initialization-status">
                    <div className="loading-spinner"></div>
                    <p>Setting up React + Vite + TypeScript...</p>
                    <p className="loading-sub">This may take a moment...</p>
                  </div>
                )}
              </>
            ) : (
              <>
                <h1>Open Existing Project</h1>
                <p>Select a project from your list</p>
                
                {isLoadingProjects ? (
                  <div className="loading-projects">
                    <div className="loading-spinner"></div>
                    <p>Loading projects...</p>
                  </div>
                ) : existingProjects.length > 0 ? (
                  <div className="project-list">
                    {existingProjects.map((project) => (
                      <div
                        key={project.fullName}
                        className={`project-item ${selectedProject === project.fullName ? 'selected' : ''}`}
                        onClick={() => setSelectedProject(project.fullName)}
                      >
                        <div className="project-info">
                          <h3>{project.displayName}</h3>
                          {project.description && <p>{project.description}</p>}
                          <span className="project-meta">
                            Last modified: {new Date(project.lastModified || '').toLocaleDateString()}
                          </span>
                        </div>
                        <button
                          className="delete-project-button"
                          onClick={async (e) => {
                            e.stopPropagation()
                            if (confirm(`Delete project "${project.displayName}"?`)) {
                              try {
                                const response = await fetch(`/api/project/delete/${project.fullName}`, {
                                  method: 'DELETE',
                                  headers: {
                                    'Authorization': `Bearer ${token}`
                                  }
                                })
                                if (response.ok) {
                                  loadExistingProjects()
                                }
                              } catch (error) {
                                console.error('Failed to delete project:', error)
                              }
                            }
                          }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="no-projects">
                    <p>No existing projects found</p>
                  </div>
                )}
                
                <div className="project-actions">
                  <button
                    onClick={() => setProjectMode(null)}
                    className="back-button"
                  >
                    Back
                  </button>
                  <button
                    onClick={() => selectedProject && loadExistingProject(selectedProject)}
                    disabled={!selectedProject || isInitializing}
                    className="open-project-button"
                  >
                    {isInitializing ? 'Loading Project...' : 'Open Project'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
      
      {/* IDE Header */}
      <div className="ide-header">
        <div className="ide-header-left">
          <h2>Web IDE</h2>
          {projectName && <span className="project-name">{projectName}</span>}
        </div>
        <div className="ide-header-right">
          <span className="user-info">
            Logged in as: <strong>{user?.username}</strong> ({user?.role})
          </span>
          <button 
            onClick={() => {
              // Clear current session and show project setup
              sessionStorage.removeItem('projectName')
              sessionStorage.removeItem('isProjectInitialized')
              setProjectName('')
              setIsProjectInitialized(false)
              setShowProjectSetup(true)
              setProjectMode(null)
              setFiles({})
              setFileTree([])
              setActiveFile(null)
              setMessages([])
              setTerminalOutput([])
            }}
            className="new-project-button"
          >
            <Plus size={16} />
            New Project
          </button>
          <button 
            onClick={() => {
              localStorage.removeItem('token')
              window.location.href = '/'
            }}
            className="logout-button"
          >
            Logout
          </button>
        </div>
      </div>
      
      <div className="ide-container">
      <div className="ide-sidebar">
        <div className="sidebar-header">
          <h3>Files</h3>
          <button
            onClick={() => setShowNewFileDialog(true)}
            className="new-file-button"
            title="New file"
          >
            <Plus size={16} />
          </button>
        </div>
        
        <FileTreeView />
        
        {/* New File Dialog */}
        {showNewFileDialog && (
          <div className="dialog-overlay" onClick={() => setShowNewFileDialog(false)}>
            <div className="dialog" onClick={e => e.stopPropagation()}>
              <h3>Create New File</h3>
              <input
                type="text"
                value={newFileName}
                onChange={(e) => setNewFileName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && createNewFile()}
                placeholder="filename.tsx"
                autoFocus
              />
              <div className="dialog-actions">
                <button onClick={() => createNewFile()} className="primary">Create</button>
                <button onClick={() => {
                  setShowNewFileDialog(false)
                  setNewFileName('')
                }}>Cancel</button>
              </div>
            </div>
          </div>
        )}
        
        {/* Delete Confirmation Dialog */}
        {fileToDelete && (
          <div className="dialog-overlay" onClick={() => setFileToDelete(null)}>
            <div className="dialog" onClick={e => e.stopPropagation()}>
              <h3>Delete File</h3>
              <p>Are you sure you want to delete {files[fileToDelete]?.name}?</p>
              <div className="dialog-actions">
                <button onClick={() => deleteFile(fileToDelete)} className="danger">Delete</button>
                <button onClick={() => setFileToDelete(null)}>Cancel</button>
              </div>
            </div>
          </div>
        )}
      </div>
      
      <div className="ide-editor">
        <div className="editor-header">
          <span>{activeFile ? files[activeFile]?.name : 'No file selected'}</span>
          <div className="editor-actions">
            <button
              onClick={() => analyzeCode('explain')}
              className="action-button"
              title="Explain code"
            >
              <Lightbulb size={16} />
            </button>
            <button
              onClick={() => analyzeCode('improve')}
              className="action-button"
              title="Improve code"
            >
              <Code size={16} />
            </button>
            <button
              onClick={() => analyzeCode('fix')}
              className="action-button"
              title="Fix bugs"
            >
              <Bug size={16} />
            </button>
            <button
              onClick={() => analyzeCode('test')}
              className="action-button"
              title="Generate tests"
            >
              <TestTube size={16} />
            </button>
            <button
              onClick={() => setShowTerminal(!showTerminal)}
              className="action-button"
              title="Toggle terminal"
            >
              <Terminal size={16} />
            </button>
            <button 
              onClick={buildAndPreview}
              disabled={isBuilding || !isEsbuildReady}
              className="run-button"
            >
              {!isEsbuildReady ? 'Loading...' : isBuilding ? 'Building...' : 'Run'}
            </button>
          </div>
        </div>
        
        <div className="editor-content">
          {activeFile ? (
            <Editor
              height="100%"
              theme="vs-dark"
              language={files[activeFile]?.language || 'typescript'}
              value={files[activeFile]?.content || ''}
              onChange={handleEditorChange}
            options={{
              minimap: { enabled: false },
              fontSize: 14
            }}
            beforeMount={(monaco) => {
              // Configure TypeScript compiler options
              monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
                target: monaco.languages.typescript.ScriptTarget.ESNext,
                allowNonTsExtensions: true,
                moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
                module: monaco.languages.typescript.ModuleKind.ESNext,
                jsx: monaco.languages.typescript.JsxEmit.React,
                jsxFactory: 'React.createElement',
                reactNamespace: 'React',
                allowJs: true,
                esModuleInterop: true,
                allowSyntheticDefaultImports: true,
                skipLibCheck: true,
                lib: ['es2020', 'dom', 'dom.iterable']
              });
              
              // Add basic React types to reduce errors
              const reactTypes = [
                'declare module "react" {',
                '  export interface ReactElement<P = any> { }',
                '  export interface FC<P = any> { (props: P): ReactElement | null; }',
                '  export function useState<T>(initial: T): [T, (value: T) => void];',
                '  export function useEffect(effect: () => void, deps?: any[]): void;',
                '  export function useRef<T>(initial: T): { current: T };',
                '  export const Fragment: any;',
                '  export default { createElement: any };',
                '}',
                'declare module "react-dom/client" {',
                '  export function createRoot(element: any): { render: (element: any) => void };',
                '}',
                'declare module "*.css" { }',
                'declare module "lucide-react" {',
                '  export const MessageSquare: any;',
                '  export const Send: any;',
                '  export const Bot: any;',
                '  export const User: any;',
                '  export const X: any;',
                '  export const Lightbulb: any;',
                '  export const Bug: any;',
                '  export const TestTube: any;',
                '  export const Code: any;',
                '  export const Plus: any;',
                '  export const Trash2: any;',
                '  export const FileText: any;',
                '  export const Folder: any;',
                '  export const Terminal: any;',
                '}'
              ].join('\n');
              
              monaco.languages.typescript.typescriptDefaults.addExtraLib(
                reactTypes,
                'file:///node_modules/@types/react/index.d.ts'
              );
            }}
          />
          ) : (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              color: '#888',
              fontSize: '18px',
              gap: '20px'
            }}>
              <p>Welcome to the React IDE!</p>
              <p style={{ fontSize: '14px' }}>Create a new file or open the terminal to get started.</p>
              <button 
                onClick={() => setShowNewFileDialog(true)}
                style={{
                  padding: '10px 20px',
                  background: '#4fc3f7',
                  border: 'none',
                  borderRadius: '4px',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Create New File
              </button>
            </div>
          )}
        </div>
      </div>
      
      <div className="ide-preview">
        <div className="preview-header">
          Preview
        </div>
        <iframe
          ref={iframeRef}
          className="preview-iframe"
          title="preview"
        />
        {output && (
          <div className="output-console">
            <div className="console-content">
              <pre style={{ color: output.toLowerCase().includes('error') ? '#f48771' : 'inherit' }}>
                {output}
              </pre>
              {output.toLowerCase().includes('error') && (
                <button 
                  className="ask-ai-button"
                  onClick={() => {
                    // Pre-fill chat with error context
                    const errorContext = `I got this error while building my React app:\n\n${output}\n\nIMPORTANT: This is a browser-based environment. NPM packages like react-router-dom are NOT available. Please provide an alternative solution using only React and ReactDOM.`
                    setInputMessage(errorContext)
                    setIsChatOpen(true)
                    // Auto-send the message
                    setTimeout(() => {
                      const sendButton = document.querySelector('.chat-input button') as HTMLButtonElement
                      if (sendButton && !sendButton.disabled) {
                        sendButton.click()
                      }
                    }, 100)
                  }}
                  title="Ask AI for help with this error"
                >
                  <Bot size={14} />
                  Ask AI for help
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Chat Button */}
      <button
        className="chat-toggle"
        onClick={() => setIsChatOpen(!isChatOpen)}
      >
        <MessageSquare size={24} />
      </button>

      {/* Chat Panel */}
      <div className={`chat-panel ${isChatOpen ? 'open' : ''}`}>
        <div className="chat-header">
          <h3>AI Assistant</h3>
          <button onClick={() => setIsChatOpen(false)} className="chat-close">
            <X size={20} />
          </button>
        </div>
        
        <div className="chat-messages">
          {messages.length === 0 && (
            <div className="chat-welcome">
              <Bot size={32} />
              <p>Hi! I'm your AI coding assistant. Ask me anything about React, JavaScript, or your code!</p>
            </div>
          )}
          
          {messages.map(message => (
            <div key={message.id} className={`chat-message ${message.role}`}>
              <div className="message-icon">
                {message.role === 'user' ? <User size={16} /> : <Bot size={16} />}
              </div>
              <div className="message-content">
                {message.content}
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="chat-message assistant">
              <div className="message-icon">
                <Bot size={16} />
              </div>
              <div className="message-content">
                <div className="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </div>
          )}
          
          <div ref={chatEndRef} />
        </div>
        
        <div className="chat-input">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Ask me anything..."
            disabled={isLoading}
          />
          <button onClick={sendMessage} disabled={isLoading || !inputMessage.trim()}>
            <Send size={18} />
          </button>
        </div>
      </div>
      
      {/* Terminal Panel */}
      {showTerminal && (
        <div className="terminal-panel">
          <div className="terminal-header">
            <h3>Terminal</h3>
            <button onClick={() => setShowTerminal(false)} className="close-button">
              <X size={18} />
            </button>
          </div>
          
          <div className="terminal-output">
            {terminalOutput.length === 0 ? (
              <div className="terminal-welcome">
                AI-Only Terminal
                <br /><br />
                This terminal is restricted to AI use only for security.
                <br />Ask the AI assistant to:
                <br />• Install packages (npm install)
                <br />• Run scripts (npm run dev, build, etc.)
                <br />• Execute any system commands
                <br />• Manage project files
                <br /><br />
                The AI has full access to all terminal commands.
              </div>
            ) : (
              <>
                {terminalOutput.map((line, index) => (
                  <div key={index} className={`terminal-line ${line.toLowerCase().includes('error') ? 'error-line' : ''}`}>
                    {line}
                  </div>
                ))}
                {terminalOutput.some(line => line.toLowerCase().includes('error')) && (
                  <button 
                    className="terminal-ask-ai-button"
                    onClick={() => {
                      // Get last few lines of terminal output with errors
                      const errorLines = terminalOutput.filter(line => line.toLowerCase().includes('error'))
                      const context = errorLines.length > 0 
                        ? errorLines.slice(-3).join('\n')
                        : terminalOutput.slice(-5).join('\n')
                      
                      const errorContext = `I got this error in the terminal:\n\n${context}\n\nCan you help me fix it?`
                      setInputMessage(errorContext)
                      setIsChatOpen(true)
                      // Auto-send the message
                      setTimeout(() => {
                        const sendButton = document.querySelector('.chat-input button') as HTMLButtonElement
                        if (sendButton && !sendButton.disabled) {
                          sendButton.click()
                        }
                      }, 100)
                    }}
                    title="Ask AI for help with terminal errors"
                  >
                    <Bot size={14} />
                    Ask AI for help with errors
                  </button>
                )}
              </>
            )}
            <div ref={terminalEndRef} />
          </div>
          
          <div className="terminal-input">
            <span className="terminal-prompt">$</span>
            <input
              type="text"
              value={terminalInput}
              onChange={(e) => setTerminalInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && executeCommand()}
              placeholder="Terminal is AI-only. Ask the assistant to run commands."
              className="terminal-input-field"
              style={{ fontStyle: 'italic', opacity: 0.7 }}
            />
          </div>
        </div>
      )}
    </div>
    </>
  )
}

export default IDE