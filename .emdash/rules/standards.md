# Coding Standards

## Editing Code
- Use `// ... keep existing code (*description*) ...` to skip unchanged sections
- For JSX: `{/* ... keep existing code ... */}`
- Minimize lines repeated - only show what changes

## Exports
- Pages/components: export default with same name as file

## State Management
- Use Zustand for sharing state between components/pages

## TypeScript
- Keep it simple - don't over-engineer types

## Errors
- Don't use try-catch blocks (errors should bubble up)

## Complete Changes
- Never make partial implementations
- All imports must exist in codebase
- No placeholder components
