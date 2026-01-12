# React/Preact Best Practices 2025

This document outlines the recommended best practices for React applications in 2025, covering file structure, architecture, security, and code quality.

## File Structure

### Recommended Directory Structure

```
src/
├── app/              # Application layer (routes, providers, router config)
├── assets/           # Static files (images, fonts, etc.)
├── components/       # Shared components across the application
│   ├── common/       # Reusable UI components
│   ├── layout/       # Layout components (header, footer, sidebar)
│   └── [domain]/     # Domain-specific shared components
├── config/           # Global configurations and environment variables
├── features/         # Feature-based modules
│   └── [feature]/
│       ├── api/      # API requests and hooks
│       ├── components/
│       ├── hooks/
│       ├── stores/
│       ├── types/
│       └── utils/
├── hooks/            # Reusable custom hooks
├── lib/              # Preconfigured libraries
├── services/         # External service integrations
├── stores/           # Global state management
├── types/            # Shared TypeScript types
└── utils/            # Shared utility functions
```

### Key Principles

1. **Modularity**: Organize by features or domains
2. **Reusability**: Components, hooks, and utilities should be easily shared
3. **Scalability**: Structure should allow easy addition of new features
4. **Separation of Concerns**: Each part of the app has its own dedicated space

## Architecture Best Practices

### Unidirectional Code Flow

Establish a clear hierarchy: `shared → features → app`

- Shared modules can be used by anyone
- Features import only from shared parts
- App layer imports from features and shared parts

### Component Development

1. **Small Components**: Decompose into small components where each performs one function
2. **Functional Components**: Prefer functional components with hooks over class components
3. **Props**: Use meaningful names, implement destructuring, apply PropTypes/TypeScript
4. **State Management**: Avoid unnecessary state; keep it centralized and pass data down as props

### Naming Conventions

- **PascalCase**: Components (e.g., `CommandBar`, `ExchangeButton`)
- **camelCase**: Methods and variables (e.g., `handleClick`, `isOpen`)
- **snake_case**: Alternative for variables/functions per project conventions
- **UPPERCASE**: Constants (e.g., `AVAILABLE_COMMANDS`)

### Performance Optimization

1. **Code Splitting**: Break bundles into smaller, load-on-demand chunks
2. **Lazy Loading**: Use `React.lazy()` for component lazy loading
3. **Memoization**: Use `React.memo`, `useMemo`, and `useCallback` to prevent unnecessary renders
4. **Virtualization**: Use virtual lists for large data sets

## Security Best Practices

### Authentication & Authorization

1. Store JWT tokens in HTTP-only cookies, not localStorage
2. Implement multi-factor authentication where appropriate
3. Use role-based access control (RBAC)
4. Consider cloud-based auth services (AWS Cognito, Auth0, etc.)

### Protection Against Common Attacks

1. **XSS Prevention**:
   - React automatically escapes values in JSX
   - Avoid `dangerouslySetInnerHTML`; if necessary, sanitize with DOMPurify
   - Validate and sanitize all user inputs

2. **SQL Injection Prevention**:
   - Validate API calls against schemas
   - Use parameterized queries on the backend

3. **CSRF Protection**:
   - Implement CSRF tokens
   - Use SameSite cookie attributes

4. **General Security**:
   - Always use HTTPS
   - Implement rate limiting on APIs
   - Keep dependencies updated
   - Never expose secrets in frontend code

### URL Validation

Always validate URLs to prevent JavaScript protocol injection:

```typescript
const is_valid_url = (url: string): boolean => {
    return url.startsWith('http://') || url.startsWith('https://');
};
```

## Code Quality

### Linting & Formatting

1. **ESLint**: Enforce code standards and catch errors
2. **Prettier**: Maintain consistent code formatting
3. **TypeScript**: Use strict type checking

### Testing

1. Write unit tests for each component
2. Use testing libraries like Vitest, Jest, or React Testing Library
3. Implement integration tests for critical user flows
4. Consider end-to-end tests for key features

### DRY Principle

- Don't Repeat Yourself
- Extract reusable logic into custom hooks
- Create shared utility functions
- Build component libraries for common UI patterns

## Component Best Practices

### Interface Definitions

Always define TypeScript interfaces for props:

```typescript
interface ButtonProps {
    variant?: 'primary' | 'secondary';
    on_click?: () => void;
    children: ComponentChildren;
}
```

### Event Handlers

Use consistent naming with `on_` or `handle_` prefix:

```typescript
const handle_click = () => { /* ... */ };
<Button on_click={handle_click}>Click me</Button>
```

### Avoid Cross-Feature Imports

Features should remain independent. Compose different features at the application level rather than importing across features.

## Sources

- [Bulletproof React - Project Structure](https://github.com/alan2207/bulletproof-react/blob/master/docs/project-structure.md)
- [React Folder Structure in 5 Steps](https://www.robinwieruch.de/react-folder-structure/)
- [React Best Practices and Security - TatvaSoft](https://www.tatvasoft.com/blog/reactjs-best-practices/)
- [React Architecture Pattern and Best Practices - GeeksforGeeks](https://www.geeksforgeeks.org/reactjs/react-architecture-pattern-and-best-practices/)
- [33 React JS Best Practices For 2025 - Technostacks](https://technostacks.com/blog/react-best-practices/)
