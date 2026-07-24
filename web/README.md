# FleetGuard AI - Web Frontend

Enterprise-grade fleet maintenance management dashboard built with React, TypeScript, and TailwindCSS.

## Technology Stack

- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: TailwindCSS with custom design tokens
- **Routing**: React Router v6
- **Data Fetching**: React Query (@tanstack/react-query)
- **State Management**: Zustand
- **Backend**: Supabase (Auth, Database, Storage, Realtime)
- **UI Components**: Custom components with dark mode support

## Features

- 🎨 **Dark Mode Support**: Toggle between light and dark themes
- 🔐 **Authentication**: Supabase Auth with role-based access control
- 📊 **Real-Time Dashboard**: Live updates using Supabase Realtime
- 📱 **Responsive Design**: Mobile-first responsive layouts
- ⚡ **Performance**: Optimized with React Query caching
- 🎯 **Type Safety**: Full TypeScript support

## Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn
- Supabase account and project

### Installation

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables:
```bash
cp .env.example .env
```

Edit `.env` and add your Supabase credentials:
```
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

3. Start the development server:
```bash
npm run dev
```

The application will open at `http://localhost:3000`

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript type checking

## Project Structure

```
web/
├── src/
│   ├── lib/          # Supabase client and utilities
│   ├── pages/        # Page components
│   ├── stores/       # Zustand stores
│   ├── App.tsx       # Main app component
│   ├── main.tsx      # Entry point
│   └── index.css     # Global styles
├── public/           # Static assets
├── index.html        # HTML template
└── vite.config.ts    # Vite configuration
```

## Design System

### Colors

The application uses a comprehensive color system with support for both light and dark modes:

- **Primary**: Blue shades for primary actions and branding
- **Success**: Green shades for positive states
- **Warning**: Yellow shades for warnings
- **Danger**: Red shades for errors and critical actions

### Theme Customization

Themes are managed via Zustand and persisted to localStorage. The theme preference applies to the entire application via the `dark` class on the HTML element.

## State Management

### Zustand Stores

- **themeStore**: Manages light/dark theme preference
- **authStore**: Manages authentication state and user session

### React Query

Used for server state management with automatic caching, background refetching, and optimistic updates.

## Authentication Flow

1. User enters credentials on login page
2. Supabase Auth validates credentials
3. User profile fetched from database
4. Auth state stored in Zustand with persistence
5. Protected routes check authentication status

## Next Steps

The following pages will be implemented in subsequent tasks:

- [ ] Vehicles management (create, edit, list, detail views)
- [ ] Components tracking with lifecycle visualization
- [ ] Work orders with mechanic assignment
- [ ] Spare parts inventory management
- [ ] Analytics dashboard with charts
- [ ] Alerts and notifications
- [ ] Document management
- [ ] Settings and configuration

## Contributing

This is part of the FleetGuard AI project. Follow the main project guidelines for contributions.

## License

Proprietary - All rights reserved
