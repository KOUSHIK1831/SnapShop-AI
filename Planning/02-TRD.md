# Technical requirements

This document summarizes the current implementation. For environment setup, see [Local development](../docs/development.md).

## Web application

- React 18 and TypeScript
- Vite 5, Tailwind CSS 3, and Radix-based UI components
- React Router, TanStack Query, and i18next
- English, Hindi, and Telugu translations

## API and data

- Express 5 API, served under `/api/v1`
- PostgreSQL 16 with Prisma schema and migrations in `apps/api/prisma/`
- API-owned authentication, authorization, validation, and data access
- Shared request schemas and types in `packages/shared/`
- Local filesystem or S3-compatible object storage through the API storage adapter

## Product integrations

- Google Identity Services for optional Google sign-in
- Gemini and Groq providers for image digitization
- WhatsApp Cloud API for messaging webhooks
- Resend or console logging for email
- Socket.IO for realtime order events

## Quality and delivery

- pnpm workspace and Turborepo task orchestration
- Vitest suites in the API and web workspaces
- TypeScript checks, web ESLint, formatting checks, and production builds
- GitHub Actions workflow at `.github/workflows/ci.yml`

## Constraints

- Must work on mobile browsers, with responsive seller and buyer flows.
- Image uploads must use authenticated API upload authorization.
- Data access must be authorized and scoped in the API.
- User-facing text must support English, Hindi, and Telugu.
- Never expose server credentials in web build variables.
