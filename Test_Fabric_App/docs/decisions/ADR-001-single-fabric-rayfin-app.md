# ADR-001: Single Fabric Rayfin application

Status: Accepted

## Context

The application contains several functional areas: Project Register, Project Index and Programme Admin, with further areas described in the product direction. They use related project identity, programme data and authentication context.

The canonical product and implementation documents describe one Rayfin app with multiple pages and permission-sensitive sections. Current routing also shows these areas inside one frontend application: `src/App.tsx` defines the `/project-register`, `/project-index`, `/admin`, `/apps` and `/auth` routes.

## Decision

Keep Project Register, Project Index, Programme Admin and later functional areas inside **one Fabric Rayfin application**. Separate the areas through routes, pages, components and access checks rather than creating independently managed Fabric applications for each functional area.

The one-application boundary includes a shared application context, shared project identity model, shared Rayfin client/data access and a shared programme model. Functional separation remains explicit in the frontend and service/domain boundaries.

## Consequences

### Benefits

- Project Register and Project Index can use the same `master_project_register` project identity and `project_guid` relationships.
- Project Index programme views and Programme Admin can use the same canonical definition and project-programme entities.
- Authentication context and client initialisation are shared through `src/main.tsx`, `AuthProvider`, `bootstrapAuth()` and `rayfinClient.ts`.
- Route-level separation allows different functional access decisions without duplicating the application shell.

### Trade-offs / constraints

- A change to shared client, entity, programme or authentication boundaries can affect more than one functional area.
- Functional separation must remain clear in routes, pages, services, domain rules and access guards; “one app” does not mean one undifferentiated component.
- This decision does not provide evidence for cost, performance, scaling, security or residency guarantees.
- Later areas should fit the shared boundary unless a new architectural decision records why they cannot.

## Guardrails

- Keep route-level access and functional responsibilities explicit in `src/App.tsx` and the relevant page/service boundaries.
- Link downstream Project Index data to the shared active project identity rather than creating a second project identity model.
- Keep Programme Admin as global application configuration, not a project-specific copy of the programme catalogue.
- Do not create a second Fabric application for a new functional area without a superseding ADR and supporting requirements/decision review.

## When to revisit

Revisit this decision if a future area requires an independently owned or deployed product boundary, a materially different data or identity boundary, or other constraints that cannot be met within the shared application. Those are triggers for review, not claims of planned work.

## Evidence and references

- [`SPEC.md`](../../SPEC.md), especially the one-app application shape and top-level pages
- [`IMPLEMENTATION-PLAN.md`](../../IMPLEMENTATION-PLAN.md), especially the one-application delivery goal
- [`SPEC-QUESTIONNAIRE.md`](../../SPEC-QUESTIONNAIRE.md), especially application structure and shared shell decisions
- `src/App.tsx`
- `src/main.tsx`
- `src/services/bootstrap.ts`
- `src/services/rayfinClient.ts`
- [Architecture overview](../architecture/architecture-overview.md)
