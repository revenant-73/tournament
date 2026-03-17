# Repository Guidelines

## Project Structure & Module Organization
This is a **React + Vite + TypeScript** application organized with a clear separation of concerns:
- **`src/components/`**: React UI components.
- **`src/services/`**: Core business logic and data handling (e.g., CSV parsing with `papaparse`).
- **`src/types/`**: Shared TypeScript interfaces and types.
- **`src/App.tsx`**: Main application entry point.

## Build, Test, and Development Commands
The project uses `npm` for dependency management and `Vite` for development.
- **Development**: `npm run dev`
- **Build**: `npm run build` (Runs TypeScript compiler and Vite build)
- **Preview Build**: `npm run preview`

*Note: No automated testing framework is currently configured.*

## Coding Style & Naming Conventions
- **TypeScript**: Enforces `"strict": true` mode.
- **Linting**: Configured in `tsconfig.json` to prevent unused locals and parameters.
- **Icons**: Uses `lucide-react` for iconography.
- **Data Parsing**: Uses `papaparse` for handling CSV data.

## Commit Guidelines
Commit messages should be concise and focused on the change, following the existing pattern of brief, descriptive titles (e.g., `FixBuild`, `FixTS`, `Deploy`).
