# Project Register

Fabric Rayfin app for creating projects and managing project splits.

## Features

- Create a new project from a site code such as `D012` or `KK123`
- Reuse existing site records and advance `next_project_number`
- Split active projects for:
  - new planning applications
  - contract splits
- Track project lineage with `guid`, `parent_guid`, `root_guid`, and effective dates

## Getting started

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) to view the app locally.

## Deploy

```bash
npm run rayfin:up
```

## Project structure

```text
├── rayfin/
│   ├── data/                # Rayfin data model entities
│   └── rayfin.yml           # Fabric service configuration
├── src/
│   ├── pages/HomePage.tsx   # Create + split project UI
│   ├── services/projectService.ts
│   └── ...
└── package.json
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Deploy app to Fabric and start local dev server |
| `npm run build` | Production build |
| `npm run build:fabric` | Build for Fabric deployment |
| `npm run lint` | Lint with ESLint |
| `npm run test` | Run unit tests with Vitest |
| `npm run rayfin:up` | Deploy app to Fabric |
