# Support and escalation

## Current support status

No permanent production support owner is currently documented. This page defines a proposed functional model for discussion; it does not assert that these roles, teams, hours or service levels currently exist.

A production support ownership and escalation model must be agreed before organisational rollout.

## Support roles as functions

| Function | Typical responsibility | Current status |
|---|---|---|
| Business/Application Owner | Owns business priority, intended behaviour, data meaning and acceptance of business decisions | Organisational decision required |
| Application Maintainer | Investigates source, configuration, tests, releases and application-level fixes | Organisational decision required |
| Fabric/Rayfin Platform Owner | Investigates Rayfin/Fabric service health, data policies, deployment platform and platform configuration | Organisational decision required |
| Identity/Security Owner | Handles authentication, role lifecycle, conditional access, security review and security incidents | Organisational decision required |
| Service Desk / First-line Support | Receives reports, performs safe triage, gathers evidence and routes escalation | Organisational decision required |

One organisation may combine functions, but the responsibilities still need to be assigned explicitly.

## Suggested escalation path

This is a proposed model requiring organisational agreement, not an SLA:

1. User or first-line support performs basic reproduction and safe evidence collection.
2. Application Maintainer investigates application, configuration, data-shape and test evidence.
3. Fabric/Rayfin Platform Owner investigates platform, entity policies, deployment and service availability.
4. Identity/Security Owner investigates identity, access, security and privacy concerns.
5. Vendor/Microsoft escalation is considered by the relevant platform or organisational owner where appropriate.

Do not infer urgency targets, support hours or response times from this sequence.

## What first-line support should do

- reproduce the symptom where safe
- identify user/project/environment scope
- record route, time, browser and exact error
- check the [troubleshooting guide](troubleshooting.md) and [configuration reference](configuration-reference.md)
- collect a redacted handover package
- stop when the next action could change production data, roles, policies or deployment state

## What first-line support should not do

- edit production data directly
- grant or remove roles ad hoc
- change Rayfin entity policies
- reveal or rotate credentials without an approved procedure
- deploy arbitrary commits
- bypass route or access controls
- attach passwords, tokens, cookies, environment files or unredacted logs

## Handover package

Use the troubleshooting report template and include, where safe:

- concise symptom and impact
- environment and route
- date/time/timezone
- user and project scope
- reproduction steps
- expected and actual behaviour
- exact error
- redacted screenshot or logs
- last known good behaviour
- commit/PR/release identifier if known
- checks already performed
- suspected functional area, without presenting a guess as a diagnosis

Review browser console/network output and logs for authentication/session values and sensitive data before attaching them.

## Known ownership gaps

The repository does not establish owners for production support, monitoring, backup/recovery, identity lifecycle, security response, deployment approval, vulnerability management or platform operations. Track these gaps in the [production-readiness register](../security/production-readiness-register.md).

## Minimum decisions before production

The organisation must assign or agree:

- accountable Business/Application Owner
- technical maintainer or support group
- Fabric/Rayfin platform owner
- identity/access owner
- security/vulnerability owner
- incident and escalation route
- change/release authority
- backup/recovery owner
- support hours and priority model, if required

This list identifies decisions; it does not make them.

## Related guidance

- [Troubleshooting](troubleshooting.md)
- [Production-readiness register](../security/production-readiness-register.md)
- [Security overview](../security/security-overview.md)
