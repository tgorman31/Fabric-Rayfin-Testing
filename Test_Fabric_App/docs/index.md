# Project documentation

This is the audience-oriented entry point for the Fabric Rayfin Project Index application. The three root Markdown files remain authoritative for product requirements, engineering roadmap and the product/business decision register. Architecture Decision Records capture the rationale and guardrails for accepted material architecture choices; the other Markdown in `/docs` provides explanatory and support documentation.

## Choose where to start

### Business or product stakeholder

Start with [`SPEC.md`](../SPEC.md) for the agreed product shape, then read [How the application works](getting-started/how-the-application-works.md) for a plain-English explanation. The [architecture overview](architecture/architecture-overview.md) explains what is current and what remains planned.

### Application administrator

Read [How the application works](getting-started/how-the-application-works.md), then the [codebase tour](getting-started/codebase-tour.md) section on Programme Admin. The current Admin page maintains programme definitions, summary memberships, dependencies and Reporting-to-Target mappings. A detailed Programme Admin user manual is **Planned documentation**.

### Developer new to this project

Read [How the application works](getting-started/how-the-application-works.md), follow the [codebase tour](getting-started/codebase-tour.md), and keep the [React/TypeScript guide](development/react-typescript-for-this-project.md) open while reading source. Then review the [architecture overview](architecture/architecture-overview.md) and [Architecture Decision Records](decisions/README.md).

### IT or security reviewer

Start with the [security overview](security/security-overview.md), then read the [threat model](security/threat-model.md) and [production-readiness register](security/production-readiness-register.md). Compare them with the [architecture overview](architecture/architecture-overview.md), [data flows and trust boundaries](architecture/data-flows-and-trust-boundaries.md), [Architecture Decision Records](decisions/README.md), [`SPEC.md`](../SPEC.md), and [`IMPLEMENTATION-PLAN.md`](../IMPLEMENTATION-PLAN.md). This is an initial evidence-based review, not a certification.

### Support or troubleshooting reader

Start with [How the application works](getting-started/how-the-application-works.md), then use the [troubleshooting guide](operations/troubleshooting.md). The [configuration reference](operations/configuration-reference.md), [deployment and release guide](operations/deployment-and-release.md), and [support and escalation guide](operations/support-and-escalation.md) cover operational follow-up. Use the [codebase tour](getting-started/codebase-tour.md) for source locations and check the current `package.json` scripts in the [README](../README.md) for local commands.

## Source-of-truth hierarchy

| Question | Authoritative source |
|---|---|
| Product and business requirements | [`SPEC.md`](../SPEC.md) |
| Engineering roadmap and architecture constraints | [`IMPLEMENTATION-PLAN.md`](../IMPLEMENTATION-PLAN.md) |
| Confirmed decisions and unresolved questions | [`SPEC-QUESTIONNAIRE.md`](../SPEC-QUESTIONNAIRE.md) |
| Rationale and guardrails for accepted material architecture choices | [Architecture Decision Records](decisions/README.md) |
| Explanatory and support material | This `/docs` directory |
| Implementation work and delivery status | GitHub Issues and pull requests |

When current code differs from a planned document, documentation should say **Current implementation** and **Planned direction** rather than silently merging them.

## Planned documentation

The following are intentionally not created as empty files: detailed Programme Admin user manual, data model reference, deployment standard operating procedure, incident-response runbook, and backup/recovery procedure.

A future Help/Documentation surface may render a curated subset of these Markdown files read-only inside the application. If that happens, Git and the version-controlled Markdown remain authoritative.

## Related documents

- [Architecture overview](architecture/architecture-overview.md)
- [Security overview](security/security-overview.md)
- [Threat model](security/threat-model.md)
- [Data flows and trust boundaries](architecture/data-flows-and-trust-boundaries.md)
- [How the application works](getting-started/how-the-application-works.md)
- [Codebase tour](getting-started/codebase-tour.md)
- [React and TypeScript for this project](development/react-typescript-for-this-project.md)
- [Configuration reference](operations/configuration-reference.md)
- [Deployment and release](operations/deployment-and-release.md)
- [Troubleshooting](operations/troubleshooting.md)
- [Support and escalation](operations/support-and-escalation.md)
- [Production-readiness register](security/production-readiness-register.md)
- [Architecture Decision Records](decisions/README.md)
