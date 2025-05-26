# AI Assistant Prompts Configuration

This directory contains the AI assistant's system prompts and persona configuration.

## Files

### `system-prompt.md`
Contains the technical instructions for the AI assistant, including:
- Core capabilities (code modification, file creation/deletion)
- Response format specifications
- JSON formats for file operations
- Best practices and guidelines
- Example interactions

**To modify:** Edit this file to change how the AI handles code-related tasks.

### `persona.md`
Defines the AI assistant's personality and communication style:
- Identity: Alex Chen, Senior React Developer
- Background and expertise
- Communication style and tone
- Response templates
- Interaction examples

**To modify:** Edit this file to change the AI's personality or communication approach.

## Customization Guide

### Changing the AI's Expertise
1. Edit `persona.md`
2. Update the background section with new expertise
3. Modify the technical philosophy to match the new focus

### Adding New Capabilities
1. Edit `system-prompt.md`
2. Add new JSON formats or instructions in the Core Capabilities section
3. Include examples of the new functionality

### Adjusting Communication Style
1. Edit `persona.md`
2. Modify the personality traits and communication style sections
3. Update response templates to match the new tone

## Usage in Code

The prompts are loaded in `server/routes/chat.js`:

```javascript
const systemPromptTemplate = readFileSync(
  join(__dirname, '../prompts/system-prompt.md'), 
  'utf-8'
)
const personaPrompt = readFileSync(
  join(__dirname, '../prompts/persona.md'), 
  'utf-8'
)
```

Both prompts are combined when making API calls to Anthropic:

```javascript
const systemPrompt = `${personaPrompt}\n\n${systemPromptTemplate}\n\n## Current Context...`
```

## Best Practices

1. **Keep prompts focused**: Each file should have a single responsibility
2. **Use markdown**: Makes prompts readable and maintainable
3. **Include examples**: Help the AI understand expected behavior
4. **Test changes**: After modifying prompts, test various scenarios
5. **Version control**: Track prompt changes as they significantly affect AI behavior

## Testing Prompt Changes

After modifying prompts:

1. Restart the server to reload the prompts
2. Test various scenarios:
   - Code generation
   - File creation/deletion
   - Bug fixes
   - Code explanations
3. Verify the AI maintains the intended persona
4. Check that all capabilities still work correctly

## Tips for Effective Prompts

- Be specific about output formats
- Provide clear examples
- Set boundaries and limitations
- Define the personality consistently
- Include error handling guidance
- Specify preferred coding patterns

Remember: The quality of AI responses directly depends on the quality of these prompts!