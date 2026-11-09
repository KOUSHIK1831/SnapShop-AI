# Contributing

Thanks for contributing to SnapShop AI. The project uses pnpm workspaces and has a React/Vite web app, an Express/Prisma API, and shared TypeScript packages.

## Requirements

- Node.js 26, as pinned by `.nvmrc`
- pnpm 11.28.5, activated with Corepack
- PostgreSQL for API development

```bash
corepack enable
corepack prepare pnpm@11.28.5 --activate
pnpm install
```

See [Local development](docs/development.md) for environment setup and database instructions.

## Before opening a pull request

Run the checks relevant to your changes:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

The lint task currently covers the web workspace. Keep tests alongside the affected workspace and avoid committing generated build output, local environment files, or credentials.

## Pull requests and commits

- Use a focused branch and pull request.
- Describe the user-visible or operational change and include any setup or migration notes.
- Use Conventional Commit messages, for example `fix: validate product stock` or `docs: clarify local setup`.
- Do not commit secrets. Report security issues using the process in [SECURITY.md](SECURITY.md).

## License

Contributions are distributed under the GNU Affero General Public License v3, as described in [LICENSE](LICENSE).
