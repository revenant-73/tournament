# Repository Guidelines

## Project Overview
Branded tournament management web app for TVVC grass doubles events, featuring a public interface for parents/coaches and a password-protected admin dashboard for tournament directors.

## Project Structure & Module Organization
- `src/pages/public/`: Publicly accessible views for tournament information, pools, and brackets.
- `src/pages/admin/`: Password-protected admin interface for managing tournament setup, seeding, and score entry.
- `src/lib/`: Core logic and third-party integrations, including `supabase.js` client and `scoring.js` utilities.
- `src/hooks/`: Custom React hooks for data fetching and state management.
- `src/components/`: Reusable UI components.
- `supabase-schema.sql`: Database schema for the Supabase backend.

## Build, Test, and Development Commands
- `npm run dev`: Start the local development server with Vite.
- `npm run build`: Build the application for production.
- `npm run lint`: Run ESLint to check for code quality and style issues.
- `npm run deploy`: Deploy the production build to GitHub Pages.
- `npm run preview`: Preview the production build locally.

## Coding Style & Naming Conventions
- Use **PascalCase** for React components and pages (e.g., `Home.jsx`, `Layout.jsx`).
- Use **camelCase** for utility functions and variables.
- Styles are handled via **Tailwind CSS**.
- ESLint is used for linting as configured in `package.json`.

## Testing Guidelines
- No testing framework is currently configured.

## Commit & Pull Request Guidelines
- Follow conventional commits where possible (`feat:`, `fix:`).
- Descriptive, refactoring-focused commit messages are also used.
