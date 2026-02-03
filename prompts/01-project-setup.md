# Prompt 01: Project Initialization

## Objective
Set up the complete monorepo structure with all configurations.

## Instructions

1. **Create monorepo structure:**
```
hums-v2/
├── apps/
│   ├── web/          # React frontend
│   └── api/          # Express backend
├── packages/
│   ├── database/     # Prisma schema
│   ├── shared/       # Shared types/utils
│   └── ui/           # Shared components (optional for later)
├── docker/
│   └── docker-compose.yml
├── .github/
│   └── workflows/
├── package.json      # Root workspace config
├── pnpm-workspace.yaml
├── turbo.json
├── .env.example
├── .gitignore
└── README.md
```

2. **Root package.json with pnpm workspaces:**
   - Scripts: dev, build, test, lint, format
   - Use Turbo for task running

3. **apps/api setup:**
   - Express.js with TypeScript
   - Folder structure: src/{routes, controllers, services, middleware, utils}
   - Basic health check endpoint
   - Error handling middleware
   - Request logging

4. **apps/web setup:**
   - Vite + React 18 + TypeScript
   - TailwindCSS configuration
   - Shadcn/ui initialization
   - Basic folder structure: src/{components, pages, hooks, lib, types}
   - React Router setup with placeholder routes for all 6 portals

5. **packages/database:**
   - Prisma schema with initial models (User, Role, Permission only)
   - Database connection config
   - Scripts for migrate, generate, studio

6. **packages/shared:**
   - Shared TypeScript types
   - Constants (roles, permissions list)
   - Utility functions

7. **Docker configuration:**
   - PostgreSQL 15
   - Redis 7
   - docker-compose.yml for local dev

8. **Configuration files:**
   - TypeScript configs (base + per-app)
   - ESLint config
   - Prettier config
   - .env.example with all required variables

## Expected Output
A fully configured monorepo where I can run:
- `pnpm install`
- `docker compose up -d` (starts DB)
- `pnpm db:migrate`
- `pnpm dev` (starts both web and api)

## Validation
- API responds at http://localhost:3001/health
- Web loads at http://localhost:3000
- Database connected and migrations run

## Validation Checklist

- [ ] `backend/` folder exists with package.json
- [ ] `frontend/` folder exists with package.json
- [ ] `npm install` runs without errors in backend
- [ ] `npm install` runs without errors in frontend
- [ ] `backend/src/index.ts` exists
- [ ] `frontend/src/main.tsx` exists
- [ ] Backend starts with `npm run dev`
- [ ] Frontend starts with `npm run dev`
- [ ] Environment files (.env.example) created
- [ ] TypeScript compiles without errors