# AI Assistant Prompting Guide

## Overview
This guide explains how to effectively interact with the AI assistant in PragcodeDev IDE.

## System Prompt Versions

### Version 1 (Classic)
- JSON-based file operations
- User confirmation for each operation
- Suitable for beginners

### Version 2 (Tool Use)
- XML-based tool use format
- Supports multiple file operations
- More autonomous decision making
- Better for experienced developers

To switch versions, edit `server/config/prompt-config.js`:
```javascript
systemPromptVersion: 'v2' // or 'v1'
```

## Effective Prompting Strategies

### 1. Task-Oriented Requests
Instead of: "Can you help me?"
Use: "Create a reusable Button component with TypeScript props"

### 2. Context-Rich Descriptions
Instead of: "Fix this"
Use: "This component is rendering slowly with 1000+ items. Optimize it."

### 3. Architectural Requests
Instead of: "Make it better"
Use: "Refactor this into smaller components following the single responsibility principle"

## Example Prompts

### Component Creation
```
"Create a Card component that accepts title, content, and an optional image prop"
```
AI will:
- Create Card.tsx with TypeScript interface
- Add proper styling
- Include accessibility attributes

### Code Refactoring
```
"This Dashboard component is too large. Split it into smaller components"
```
AI will:
- Analyze the component
- Extract logical sections
- Create new files for each component
- Update imports automatically

### Bug Fixing
```
"The form doesn't validate email addresses correctly"
```
AI will:
- Identify the validation logic
- Fix the regex or validation method
- Add test cases if needed

### Performance Optimization
```
"Optimize this list component that renders 10,000 items"
```
AI will:
- Implement virtualization
- Add memoization
- Suggest pagination or infinite scroll

### Test Generation
```
"Generate tests for the Button component"
```
AI will:
- Create Button.test.tsx
- Write comprehensive test cases
- Include edge cases

## Advanced Techniques

### 1. Multi-File Operations
```
"Convert this JavaScript project to TypeScript"
```
AI will create/update multiple files in one response.

### 2. Architecture Planning
```
"Design a folder structure for a e-commerce app with products, cart, and checkout"
```
AI will suggest and create the entire structure.

### 3. Code Review
```
"Review this code for best practices and potential issues"
```
AI will analyze and suggest improvements.

## Tool Use Examples (v2 only)

### Reading Files
```
"Analyze all components in the components folder"
```
AI uses: `<read_file>` tool to examine files

### Creating Multiple Files
```
"Create a complete authentication system"
```
AI uses: Multiple `<create_file>` operations

### Refactoring
```
"Extract all inline styles to CSS modules"
```
AI uses: `<update_file>` and `<create_file>` tools

## Tips for Best Results

1. **Be Specific**: Clear requirements lead to better code
2. **Provide Context**: Explain the purpose and constraints
3. **Iterate**: Start simple, then add complexity
4. **Review Changes**: Always review AI suggestions before applying
5. **Learn Patterns**: AI follows React best practices

## Common Patterns

### Custom Hooks
```
"Extract this state logic into a custom hook"
```

### HOCs to Hooks
```
"Convert this Higher Order Component to a custom hook"
```

### State Management
```
"Implement global state for user authentication"
```

### API Integration
```
"Create a service to fetch and cache user data"
```

## Limitations

- Cannot modify system files (package.json, tsconfig.json)
- File size limit: 50KB per file
- Supported extensions: .ts, .tsx, .js, .jsx, .css, .json, .md
- Maximum 5 file operations per response

## Troubleshooting

### AI not creating files?
- Check if autonomous operations are enabled in config
- Ensure your prompt clearly indicates file creation need

### Wrong file paths?
- AI assumes `/src/` prefix for most operations
- Specify full paths if needed

### Code not working?
- AI code might need minor adjustments
- Always test after applying changes
- Use the preview feature to verify

Remember: The AI is a powerful assistant, but always review and understand the code it generates!