# SnapShop AI engineering principles

## Architecture

- Keep web, API, and shared packages as distinct workspace projects.
- Treat the Express API as the only browser-facing data boundary.
- Keep the Prisma schema and migrations as the source of truth for the active database.
- Share contracts and validation schemas only when both workspaces need them.

## Security and data

- Enforce authentication, authorization, validation, and tenant scoping in the API.
- Keep secrets server-side and out of version control.
- Treat seed data and credentials as development-only.
- Make data changes explicit, reviewable, and covered by migrations.

## Maintainability

- Group code by product domain and keep dependencies flowing toward shared contracts.
- Keep documentation aligned with the implemented behavior.
- Run relevant formatting, lint, typecheck, build, and regression checks before merging.

## [SECTION_2_NAME]

<!-- Example: Additional Constraints, Security Requirements, Performance Standards, etc. -->

[SECTION_2_CONTENT]

<!-- Example: Technology stack requirements, compliance standards, deployment policies, etc. -->

## [SECTION_3_NAME]

<!-- Example: Development Workflow, Review Process, Quality Gates, etc. -->

[SECTION_3_CONTENT]

<!-- Example: Code review requirements, testing gates, deployment approval process, etc. -->

## Governance

<!-- Example: Constitution supersedes all other practices; Amendments require documentation, approval, migration plan -->

[GOVERNANCE_RULES]

<!-- Example: All PRs/reviews must verify compliance; Complexity must be justified; Use [GUIDANCE_FILE] for runtime development guidance -->

**Version**: [CONSTITUTION_VERSION] | **Ratified**: [RATIFICATION_DATE] | **Last Amended**: [LAST_AMENDED_DATE]

<!-- Example: Version: 2.1.1 | Ratified: 2025-06-13 | Last Amended: 2025-07-16 -->
