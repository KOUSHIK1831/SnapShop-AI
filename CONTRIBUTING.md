# Contributing to ApnaBazar

Thank you for your interest in contributing to the ApnaBazar project! This document provides guidelines and information for contributors to help keep our marketplace robust and high-quality.

## 🚀 Quick Start

### Prerequisites

- **Node.js** (v22 or higher)
- **npm** (v10 or higher)
- **Git**

### Local Development Setup

1. **Clone the Repository**

   ```bash
   git clone <repository-url>
   cd hackathon-cs
   ```

2. **Install Dependencies**

   ```bash
   npm install
   ```

3. **Start Development Server**

   ```bash
   npm run dev
   ```

4. **Open in Browser**
   Navigate to `http://localhost:8080` (or the port shown in your terminal) to view the application.

## 🛠️ Available Scripts

- `npm run dev`: Start development server.
- `npm run build`: Build for production.
- `npm run lint`: Run ESLint.
- `npm run type-check`: Run TypeScript type checks.
- `npm run format`: Fix code formatting with Prettier.
- `npm run test`: Run unit tests.
- `npm run test:coverage`: Run tests and generate coverage report.
- `npm run validate`: Run linting, type checks, and tests.

## 📁 Project Structure

```
hackathon-cs/
├── public/                 # Static assets
├── src/
│   ├── components/         # React components
│   │   ├── ui/            # Reusable UI components (shadcn/ui)
│   │   └── ...            # Feature-specific components
│   ├── hooks/             # Custom React hooks
│   ├── lib/               # Utility functions and constants
│   ├── pages/             # Page components
│   ├── integrations/      # Supabase and other external integrations
│   ├── locales/           # i18n translation files
│   ├── App.tsx            # Main app component
│   └── main.tsx           # App entry point
├── supabase/               # Supabase migrations and Edge Functions
├── tailwind.config.ts     # Tailwind CSS configuration
├── vite.config.ts         # Vite configuration
└── package.json           # Dependencies and scripts
```

## 🎨 Tech Stack

- **Frontend Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui (Radix UI primitives)
- **Icons**: Lucide React
- **Routing**: React Router DOM
- **Forms**: React Hook Form with Zod validation
- **State Management**: TanStack Query (React Query)
- **Backend**: Supabase (Auth, Database, Storage, Edge Functions)
- **Internationalization**: i18next
- **Code Quality**: ESLint, Prettier, TypeScript, Husky, Commitlint

## 📝 Development Guidelines

### Code Style

1. **TypeScript**: Always use TypeScript. Avoid `any`.
2. **Components**: Use functional components with hooks.
3. **Naming**: PascalCase for components/files, camelCase for functions/variables.
4. **Formatting**: Code formatting is enforced by Prettier. Run `npm run format` before committing.

### Component Guidelines

1. **File Structure**: One component per file.
2. **Props**: Explicitly define prop interfaces.
3. **Shadcn/UI**: Leverage existing components in `src/components/ui/` whenever possible.

## 🔧 Development Workflow

### 1. Create a Branch

```bash
git checkout -b <type>/<short-description>
# Examples: feat/add-seller-profile, fix/broken-cart-logic
```

### 2. Make Your Changes

- Write clean, documented code.
- Add unit tests for new logic in `*.test.tsx` or `*.test.ts`.
- Ensure your changes are accessible.

### 3. Test & Validate

Before committing, ensure everything is working:

```bash
npm run validate
```

### 4. Commit Your Changes

ApnaBazar follows the [Conventional Commits](https://www.conventionalcommits.org/) specification.

#### Format: `<type>: <subject>`

| Type       | Description                                                                   |
| ---------- | ----------------------------------------------------------------------------- |
| `feat`     | New feature                                                                   |
| `fix`      | Bug fix                                                                       |
| `docs`     | Documentation changes                                                         |
| `style`    | Formatting, missing semi colons, etc; no code change                          |
| `refactor` | Refactoring production code                                                   |
| `test`     | Adding missing tests, refactoring tests; no production code change            |
| `chore`    | Updating build tasks, package manager configs, etc; no production code change |

```bash
git add .
git commit -m "feat: add WhatsApp order notification"
```

### 5. Create a Merge Request

Push your branch and open a Merge Request on GitLab. Use the default template provided.

## 📄 License

By contributing to ApnaBazar, you agree that your contributions will be licensed under the **GNU Affero General Public License (AGPL) v3**.

---

Thank you for helping us build ApnaBazar! 🚀
