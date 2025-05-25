import { useState, useEffect, useRef } from 'react'
import Editor from '@monaco-editor/react'
import './App.css'

interface FileNode {
  name: string
  content: string
  language: string
}

// Dynamic import for esbuild-wasm
let esbuildInstance: any = null

function App() {
  const [files, setFiles] = useState<Record<string, FileNode>>({
    '/src/App.tsx': {
      name: 'App.tsx',
      content: `import React from 'react';

function App() {
  return (
    <div>
      <h1>Hello React!</h1>
      <p>Start editing to see changes...</p>
    </div>
  );
}

export default App;`,
      language: 'typescript'
    },
    '/src/index.tsx': {
      name: 'index.tsx',
      content: `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(<App />);`,
      language: 'typescript'
    }
  })
  
  const [activeFile, setActiveFile] = useState('/src/App.tsx')
  const [output, setOutput] = useState('')
  const [isBuilding, setIsBuilding] = useState(false)
  const [isEsbuildReady, setIsEsbuildReady] = useState(false)
  const iframeRef = useRef<HTMLIFrameElement>(null)

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

  const handleEditorChange = (value: string | undefined) => {
    if (value !== undefined) {
      setFiles(prev => ({
        ...prev,
        [activeFile]: {
          ...prev[activeFile],
          content: value
        }
      }))
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

      const result = await esbuildInstance.build({
        stdin: {
          contents: transformedFiles['/src/index.tsx'],
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
              build.onResolve({ filter: /^\./ }, (args: any) => {
                return { 
                  path: `/src/${args.path.slice(2)}`,
                  namespace: 'virtual-fs' 
                }
              })

              build.onLoad({ filter: /.*/, namespace: 'virtual-fs' }, (args: any) => {
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
      const html = `
        <!DOCTYPE html>
        <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <script crossorigin src="https://unpkg.com/react@18/umd/react.development.js"></script>
            <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
            <script>
              window.React = window.React || {};
              window.ReactDOM = window.ReactDOM || {};
            </script>
          </head>
          <body>
            <div id="root"></div>
            <script>
              (function() {
                ${code}
              })();
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
      setOutput(`Build error: ${error instanceof Error ? error.message : String(error)}`)
      console.error('Build error:', error)
    } finally {
      setIsBuilding(false)
    }
  }

  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      <div style={{ width: '200px', background: '#1e1e1e', padding: '10px' }}>
        <h3 style={{ color: 'white', margin: '0 0 10px 0' }}>Files</h3>
        {Object.entries(files).map(([path, file]) => (
          <div
            key={path}
            onClick={() => setActiveFile(path)}
            style={{
              padding: '5px 10px',
              cursor: 'pointer',
              color: activeFile === path ? '#4fc3f7' : '#ccc',
              background: activeFile === path ? '#2a2a2a' : 'transparent'
            }}
          >
            {file.name}
          </div>
        ))}
      </div>
      
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ height: '40px', background: '#2d2d2d', padding: '5px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ color: '#ccc' }}>{files[activeFile]?.name}</span>
          <button 
            onClick={buildAndPreview}
            disabled={isBuilding || !isEsbuildReady}
            style={{
              padding: '5px 20px',
              background: isEsbuildReady ? '#4fc3f7' : '#666',
              border: 'none',
              borderRadius: '4px',
              color: 'white',
              cursor: isBuilding || !isEsbuildReady ? 'not-allowed' : 'pointer'
            }}
          >
            {!isEsbuildReady ? 'Loading...' : isBuilding ? 'Building...' : 'Run'}
          </button>
        </div>
        
        <div style={{ flex: 1 }}>
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
          />
        </div>
      </div>
      
      <div style={{ width: '50%', display: 'flex', flexDirection: 'column' }}>
        <div style={{ height: '40px', background: '#2d2d2d', padding: '5px 10px', color: '#ccc' }}>
          Preview
        </div>
        <iframe
          ref={iframeRef}
          style={{ flex: 1, background: 'white', border: 'none' }}
          title="preview"
        />
        {output && (
          <div style={{ height: '100px', background: '#1e1e1e', color: '#ccc', padding: '10px', overflow: 'auto' }}>
            {output}
          </div>
        )}
      </div>
    </div>
  )
}

export default App