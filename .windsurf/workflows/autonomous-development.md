---
description: Run autonomous development tasks in the background
---

# Autonomous Development Workflow

This workflow enables continuous background development of Linear tickets without manual intervention.

## How to Use

1. **Ensure Linear tickets are created** and prioritized
2. **Run this workflow** using `/autonomous-dev`
3. **Monitor progress** through Linear and Git commits

## Process Steps

### Step 1: Ticket Selection
- Pull high-priority tickets from Linear
- Filter by "Ready for Development" status
- Check dependencies and blockers

### Step 2: Development Planning
- Analyze requirements and acceptance criteria
- Generate implementation plan
- Identify required files and components

### Step 3: Implementation
- Create/modify code files
- Follow project patterns and conventions
- Add tests and documentation

### Step 4: Quality Assurance
- Run linting and type checking
- Execute test suites
- Verify functionality

### Step 5: Integration
- Commit changes with ticket references
- Update ticket status in Linear
- Create pull requests if needed

## Background Execution

The workflow runs continuously:
- **Polls Linear** every 5 minutes for new tickets
- **Processes tickets** in priority order
- **Handles failures** with retry logic
- **Provides progress updates**

## Development Patterns

### Component Creation
```typescript
// Follows existing patterns
- Uses shadcn/ui components
- Implements proper TypeScript types
- Includes accessibility features
- Follows naming conventions
```

### Hook Development
```typescript
// Custom hooks pattern
- Uses React Query for data fetching
- Implements proper error handling
- Includes loading states
- Follows existing patterns
```

### API Integration
```typescript
// Supabase integration
- Uses existing client configuration
- Implements proper error handling
- Includes type safety
- Follows authentication patterns
```

## Quality Gates

- **Code Quality**: ESLint, TypeScript checks
- **Testing**: Unit tests for new components
- **Security**: No sensitive data exposure
- **Performance**: Bundle size impact assessment
- **Accessibility**: WCAG compliance checks

## Monitoring & Logging

- **Progress Tracking**: Real-time ticket status updates
- **Error Logging**: Detailed error reports
- **Performance Metrics**: Development velocity tracking
- **Quality Metrics**: Code quality scores

## Failure Handling

- **Automatic Retries**: 3 attempts for transient failures
- **Manual Intervention**: Escalates complex issues
- **Rollback Capability**: Reverts problematic changes
- **Notification System**: Alerts for critical failures

## Best Practices

1. **Incremental Development**: Small, testable changes
2. **Documentation**: Code comments and README updates
3. **Testing**: Comprehensive test coverage
4. **Code Review**: Automated quality checks
5. **Communication**: Clear commit messages and ticket updates
