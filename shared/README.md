# Shared Module

This directory contains shared TypeScript types, utilities, and constants used across the web frontend, mobile apps, and edge functions.

## Structure

```
shared/
├── types/           # TypeScript type definitions
├── utils/           # Shared utility functions
├── constants/       # Shared constants and enums
└── validators/      # Shared validation logic
```

## Usage

### In Web Application
```typescript
import { UserRole, Vehicle } from '../shared/types';
```

### In Mobile Apps
```typescript
import { UserRole, Vehicle } from '../shared/types';
```

### In Edge Functions
```typescript
import { UserRole, Vehicle } from '../shared/types/mod.ts';
```

## Guidelines

- Keep types in sync with database schema
- Use enums for fixed value sets (roles, statuses, etc.)
- Document complex types with JSDoc comments
- Maintain backward compatibility when updating types
