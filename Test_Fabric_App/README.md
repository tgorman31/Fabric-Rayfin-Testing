# Fabric Rayfin Project Index

This repository contains one Fabric Rayfin application. It combines a **Project Register** whose launcher and route access are currently role-gated through `app_user_role` with a broader **Project Index** for project information and programme management. The current Project Register write service/data-layer boundary has a documented production-hardening limitation; see the [Security Overview](docs/security/security-overview.md). It is a lightweight project/programme-management application and is actively evolving; parts of the wider specification are still under development.

## Current application areas

- **Project Index** — authenticated users can search projects, open a project workspace, edit project information, maintain Reporting Programme dates, and work with the implemented Target Programme slice.
- **Project Register** — launcher and route access are role-gated through `app_user_role`; users who pass that application flow can create projects, split planning or contract references, and view project history. The current write service/data-layer authorisation boundary has a documented production-hardening limitation; see the [Security Overview](docs/security/security-overview.md).
- **Programme Admin** — authorised administrators can maintain programme definitions, summary memberships, dependencies and Reporting-to-Target mappings.
- **Future or partial areas** — Tenure and Board Report are represented in the planned shape, but the current UI does not implement the full specification for them.

## Technology

The frontend uses React and TypeScript, bundled and served locally with Vite. The application uses the Rayfin client and Fabric/Rayfin data platform for authentication and data access. Vitest is used for tests and ESLint for linting. Leaflet/react-leaflet provide the current map preview.

## Documentation map

Start with [`docs/index.md`](docs/index.md), which routes readers by role.

The canonical project decisions remain:

- [`SPEC.md`](SPEC.md) — functional and business requirements
- [`IMPLEMENTATION-PLAN.md`](IMPLEMENTATION-PLAN.md) — engineering roadmap and architecture constraints
- [`SPEC-QUESTIONNAIRE.md`](SPEC-QUESTIONNAIRE.md) — confirmed decisions and unresolved questions

Further reading:

- [How the application works](docs/getting-started/how-the-application-works.md)
- [Codebase tour](docs/getting-started/codebase-tour.md)
- [React and TypeScript for this project](docs/development/react-typescript-for-this-project.md)
- [Architecture overview](docs/architecture/architecture-overview.md)
- [Security overview](docs/security/security-overview.md)

## Local development

From `Test_Fabric_App/`:

```bash
npm run dev
```

This runs `rayfin up --exclude-services staticHosting` through the `predev` setup and then starts Vite. Open <http://localhost:5173>.

### Local Programme Admin bootstrap

For first local-development Programme Admin bootstrap, create `.env.local` with a placeholder for the signed-in user:

```text
VITE_PROGRAMME_ADMIN_BOOTSTRAP_EMAIL=<signed-in-user-email>
```

Run locally while signed in as that user, then use **Bootstrap Admin access** in the launcher. `.env.local` is ignored by Git and **must not be committed**. Never put real credentials, tokens or secrets in Markdown, source control, or examples.

## Commands

These commands come from the current `package.json`:

| Command | Purpose |
|---|---|
| `npm run dev` | Start Rayfin local services (excluding static hosting) and Vite |
| `npm run build` | Type-check and build the Vite application |
| `npm run build:fabric` | Build the application for Fabric deployment |
| `npm run lint` | Run ESLint |
| `npm run test` | Run the Vitest test suite |
| `npm run preview` | Preview the built Vite application |
| `npm run rayfin:up` | Bring up/deploy the Rayfin application services |

## Status and support

The application and its documentation are under active development. This repository does not document a permanent production support owner. For requirements or intended direction, use the canonical Markdown files above; for implementation context, use [`docs/index.md`](docs/index.md) and the linked guides.
