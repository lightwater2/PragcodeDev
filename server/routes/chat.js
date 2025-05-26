import express from 'express'
import Anthropic from '@anthropic-ai/sdk'
import dotenv from 'dotenv'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

// Load environment variables
dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Import configuration
import { promptConfig } from '../config/prompt-config.js'

// Load prompts based on configuration
const systemPromptFile = promptConfig.systemPromptVersion === 'v2' 
  ? 'system-prompt-v2.md' 
  : 'system-prompt.md'

const systemPromptTemplate = readFileSync(
  join(__dirname, '../prompts/', systemPromptFile), 
  'utf-8'
)
const personaPrompt = readFileSync(
  join(__dirname, '../prompts/persona.md'), 
  'utf-8'
)

const router = express.Router()

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.VITE_ANTHROPIC_API_KEY,
})

// Log to verify API key is loaded (remove in production)
console.log('API Key loaded:', process.env.VITE_ANTHROPIC_API_KEY ? 'Yes' : 'No')

// Test endpoint for XML parsing
router.post('/test-xml', async (req, res) => {
  const testMessage = `
<tool_use>
<create_file>
<path>src/components/TestComponent.tsx</path>
<content>import React from 'react'

export function TestComponent() {
  return <div>Test Component</div>
}
</content>
</create_file>
</tool_use>
  `
  
  const xmlCreateMatch = testMessage.match(/<create_file>\s*<path>(.*?)<\/path>\s*<content>([\s\S]*?)<\/content>\s*<\/create_file>/g)
  const operations = []
  
  if (xmlCreateMatch) {
    xmlCreateMatch.forEach(match => {
      const pathMatch = match.match(/<path>(.*?)<\/path>/)
      const contentMatch = match.match(/<content>([\s\S]*?)<\/content>/)
      if (pathMatch && contentMatch) {
        operations.push({
          action: 'create',
          fileName: pathMatch[1],
          content: contentMatch[1]
        })
      }
    })
  }
  
  res.json({ success: true, operations })
})

// Helper function to detect non-code content
function isNonCodeContent(content) {
  const looksLikeMarkdown = /^#|^\*\*|^###|^-\s|^\d+\./m.test(content)
  const looksLikeProjectStructure = /├──|└──|│/m.test(content) || /^(src|public|components|pages)\//m.test(content)
  return looksLikeMarkdown || looksLikeProjectStructure
}

router.post('/', async (req, res) => {
  try {
    const { messages, currentCode, fileName, projectName } = req.body

    // Build the conversation context with persona and system prompt
    const systemPrompt = `${personaPrompt}

${systemPromptTemplate}

## Current Context (FOR REFERENCE ONLY - DO NOT UPDATE UNLESS EXPLICITLY REQUESTED)
- **Project Name**: ${projectName || 'Not specified'}
- **Currently viewing file**: ${fileName}
- **File content for context**:
\`\`\`typescript
${currentCode}
\`\`\`

IMPORTANT: 
1. You are working in the root directory of the project "${projectName}". All file operations should be relative to this project root.
2. The above file is shown for context only. Do NOT update ${fileName} unless the user specifically asks you to modify this particular file. 
3. When creating project documentation or structure descriptions, create new .md files instead.

Remember to embody the Alex Chen persona while providing assistance.`

    // Convert messages to Anthropic format
    const formattedMessages = messages.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: msg.content
    }))

    // Call Anthropic API
    const response = await anthropic.messages.create({
      model: process.env.VITE_ANTHROPIC_MODEL || 'claude-3-sonnet-20240229',
      max_tokens: parseInt(process.env.VITE_ANTHROPIC_MAX_TOKENS) || 4096,
      system: systemPrompt,
      messages: formattedMessages,
    })

    const assistantMessage = response.content[0].text

    // Check if the response contains code suggestions
    let suggestedCode = null
    const codeBlockMatch = assistantMessage.match(/```(?:jsx?|tsx?|javascript|typescript)?\n([\s\S]+?)```/)
    
    if (codeBlockMatch) {
      suggestedCode = codeBlockMatch[1].trim()
    }

    // Check for file operations (both JSON and XML formats)
    let fileOperations = []
    
    // Log for debugging
    console.log('Processing AI response for file operations...')
    
    // Check for JSON format (backward compatibility)
    const jsonMatch = assistantMessage.match(/\{\s*"action"\s*:\s*"(create|delete)"[\s\S]+?}/g)
    if (jsonMatch) {
      try {
        fileOperations.push(JSON.parse(jsonMatch[0]))
      } catch (e) {
        console.error('Failed to parse JSON file operation:', e)
      }
    }
    
    // Check for XML tool use format
    const xmlCreateMatch = assistantMessage.match(/<create_file>\s*<path>(.*?)<\/path>\s*<content>([\s\S]*?)<\/content>\s*<\/create_file>/g)
    if (xmlCreateMatch) {
      xmlCreateMatch.forEach(match => {
        const pathMatch = match.match(/<path>(.*?)<\/path>/)
        const contentMatch = match.match(/<content>([\s\S]*?)<\/content>/)
        if (pathMatch && contentMatch) {
          const filePath = pathMatch[1]
          const fileContent = contentMatch[1].trim()
          
          // Validate file path and content
          if (filePath && fileContent) {
            console.log(`Creating file: ${filePath}`)
            
            // Check if this looks like code or documentation
            const isCodeFile = /\.(ts|tsx|js|jsx|css|json)$/i.test(filePath)
            
            if (isCodeFile && isNonCodeContent(fileContent)) {
              console.warn(`Warning: Trying to put non-code content in code file: ${filePath}`)
              console.log(`Content preview: ${fileContent.substring(0, 100)}...`)
              // Skip this operation
            } else {
              fileOperations.push({
                action: 'create',
                fileName: filePath,
                content: fileContent
              })
            }
          }
        }
      })
    }
    
    const xmlDeleteMatch = assistantMessage.match(/<delete_file>\s*<path>(.*?)<\/path>\s*<\/delete_file>/g)
    if (xmlDeleteMatch) {
      xmlDeleteMatch.forEach(match => {
        const pathMatch = match.match(/<path>(.*?)<\/path>/)
        if (pathMatch) {
          fileOperations.push({
            action: 'delete',
            fileName: pathMatch[1]
          })
        }
      })
    }
    
    const xmlUpdateMatch = assistantMessage.match(/<update_file>\s*<path>(.*?)<\/path>\s*<content>([\s\S]*?)<\/content>\s*<\/update_file>/g)
    if (xmlUpdateMatch) {
      xmlUpdateMatch.forEach(match => {
        const pathMatch = match.match(/<path>(.*?)<\/path>/)
        const contentMatch = match.match(/<content>([\s\S]*?)<\/content>/)
        if (pathMatch && contentMatch) {
          const filePath = pathMatch[1]
          const fileContent = contentMatch[1].trim()
          
          // Validate file path and content
          if (filePath && fileContent) {
            console.log(`Updating file: ${filePath}`)
            
            // Check if this looks like code or documentation
            const isCodeFile = /\.(ts|tsx|js|jsx|css|json)$/i.test(filePath)
            
            if (isCodeFile && isNonCodeContent(fileContent)) {
              console.warn(`Warning: Trying to put non-code content in code file: ${filePath}`)
              console.log(`Content preview: ${fileContent.substring(0, 100)}...`)
              // Skip this operation
            } else if (filePath === fileName && isNonCodeContent(fileContent)) {
              console.warn(`Warning: Trying to put non-code content in currently viewed file: ${filePath}`)
              console.log(`This looks like documentation - should go in a .md file instead`)
              // Skip this operation - likely meant for a .md file
            } else {
              fileOperations.push({
                action: 'update',
                fileName: filePath,
                content: fileContent
              })
            }
          }
        }
      })
    }

    // Check for terminal commands
    let terminalCommands = []
    const xmlTerminalMatch = assistantMessage.match(/<execute_command>\s*<command>(.*?)<\/command>\s*<\/execute_command>/g)
    if (xmlTerminalMatch) {
      xmlTerminalMatch.forEach(match => {
        const commandMatch = match.match(/<command>(.*?)<\/command>/)
        if (commandMatch) {
          terminalCommands.push(commandMatch[1])
        }
      })
    }
    
    // Strip code blocks and tool use sections from the displayed message
    let displayContent = assistantMessage
    
    // Remove code blocks
    displayContent = displayContent.replace(/```[\s\S]*?```/g, '')
    
    // Remove tool use XML sections
    displayContent = displayContent.replace(/<tool_use>[\s\S]*?<\/tool_use>/g, '')
    displayContent = displayContent.replace(/<create_file>[\s\S]*?<\/create_file>/g, '')
    displayContent = displayContent.replace(/<update_file>[\s\S]*?<\/update_file>/g, '')
    displayContent = displayContent.replace(/<delete_file>[\s\S]*?<\/delete_file>/g, '')
    displayContent = displayContent.replace(/<execute_command>[\s\S]*?<\/execute_command>/g, '')
    
    // Clean up extra whitespace
    displayContent = displayContent.trim().replace(/\n\n+/g, '\n\n')
    
    res.json({
      content: displayContent,
      suggestedCode: suggestedCode,
      fileOperations: fileOperations, // Changed to array for multiple operations
      terminalCommands: terminalCommands, // New: terminal commands from AI
      usage: response.usage
    })

  } catch (error) {
    console.error('Chat API error:', error)
    
    // Handle specific Anthropic errors
    if (error.status === 401) {
      return res.status(401).json({
        error: 'Invalid API key',
        message: 'Please check your Anthropic API key configuration'
      })
    }
    
    if (error.status === 429) {
      return res.status(429).json({
        error: 'Rate limit exceeded',
        message: 'Too many requests. Please try again later.'
      })
    }

    res.status(500).json({
      error: 'Failed to process chat request',
      message: error.message
    })
  }
})

// Code analysis endpoint
router.post('/analyze', async (req, res) => {
  try {
    const { code, action, selection } = req.body

    // Use persona for code analysis too
    const analysisSystemPrompt = `${personaPrompt}

You are analyzing code as Alex Chen. Provide helpful, educational responses.`

    let prompt = ''
    switch (action) {
      case 'explain':
        prompt = `Please explain this code in a clear, educational way:\n\`\`\`typescript\n${selection || code}\n\`\`\``
        break
      case 'improve':
        prompt = `Review this code and suggest improvements following React best practices:\n\`\`\`typescript\n${code}\n\`\`\``
        break
      case 'fix':
        prompt = `Identify and fix any bugs or issues in this code:\n\`\`\`typescript\n${code}\n\`\`\``
        break
      case 'test':
        prompt = `Generate comprehensive unit tests for this code using React Testing Library:\n\`\`\`typescript\n${code}\n\`\`\``
        break
      default:
        return res.status(400).json({ error: 'Invalid action' })
    }

    const response = await anthropic.messages.create({
      model: process.env.VITE_ANTHROPIC_MODEL || 'claude-3-sonnet-20240229',
      max_tokens: parseInt(process.env.VITE_ANTHROPIC_MAX_TOKENS) || 4096,
      system: analysisSystemPrompt,
      messages: [{ role: 'user', content: prompt }],
    })

    res.json({
      content: response.content[0].text,
      usage: response.usage
    })

  } catch (error) {
    console.error('Analyze API error:', error)
    res.status(500).json({
      error: 'Failed to analyze code',
      message: error.message
    })
  }
})

// Terminal command execution endpoint
router.post('/terminal', async (req, res) => {
  try {
    const { command } = req.body
    
    if (!command) {
      return res.status(400).json({ error: 'Command is required' })
    }
    
    // Security: Whitelist allowed commands
    const allowedCommands = [
      'npm install',
      'npm run',
      'npm list',
      'node --version',
      'npm --version',
      'ls',
      'pwd'
    ]
    
    const isAllowed = allowedCommands.some(allowed => 
      command.startsWith(allowed)
    )
    
    if (!isAllowed) {
      return res.status(403).json({ 
        error: 'Command not allowed',
        message: 'Only npm and basic file system commands are allowed'
      })
    }
    
    // Execute command
    const { exec } = await import('child_process')
    const { promisify } = await import('util')
    const execAsync = promisify(exec)
    
    console.log(`Executing command: ${command}`)
    
    try {
      const { stdout, stderr } = await execAsync(command, {
        cwd: process.cwd(),
        env: process.env
      })
      
      res.json({
        success: true,
        output: stdout || stderr,
        command
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

export default router