# Decisions

## 2026-07-09 — Build ForgePilot as the first dogfood product

Decision:

Use ForgePilot as the first real dogfood product for Project Forge v0.5.0.

Why:

Forge itself is stable enough at v0.5.0. Further internal polishing has diminishing returns until the workflow is tested on a real product.

Alternatives considered:

- continue polishing Forge internally;
- build a generic todo app;
- build an unrelated portfolio/demo app.

Outcome:

ForgePilot becomes a separate product repository under /home/remem/projects/forgepilot.

## 2026-07-09 — Keep ForgePilot v0.1.0 local-first and single-workspace

Decision:

ForgePilot v0.1.0 will be a focused local-first dashboard, not a multi-tenant SaaS.

Why:

The core risk is not SaaS infrastructure. The core risk is whether the Forge workflow helps build a real product clearly and consistently.

Alternatives considered:

- add auth immediately;
- design teams/workspaces from day one;
- build public SaaS infrastructure before proving the product model.

Outcome:

Auth, teams, billing, OAuth, and multi-tenant complexity are out of scope for v0.1.0.

## 2026-07-09 — Keep GitHub import out of the MVP

Decision:

ForgePilot v0.1.0 will not automatically import GitHub repository data.

Why:

Manual data is enough to prove the dashboard, task board, decision log, dogfooding log, handoff prompt generator, and release timeline.

Alternatives considered:

- GitHub OAuth;
- GitHub API import;
- automatic PR/release synchronization.

Outcome:

GitHub import is deferred until the manual dashboard proves useful.

## 2026-07-09 — Treat dogfooding as a product feature

Decision:

ForgePilot will treat dogfooding findings as first-class product data.

Why:

The product exists to test Project Forge in real use. If workflow friction is not captured, the dogfood project fails its main purpose.

Alternatives considered:

- keep dogfooding notes only in chat;
- record friction only after releases;
- treat dogfooding as informal notes.

Outcome:

The dogfooding log is part of the MVP.

## 2026-07-09 — Publish ForgePilot as a public dogfood repository

Decision:

Publish ForgePilot as a public GitHub repository.

Why:

ForgePilot is intended to demonstrate AI-assisted product development through Project Forge. The repository should show the workflow, decisions, lifecycle artifacts, dogfooding notes, and implementation history openly.

Alternatives considered:

- keep the repository private until v0.1.0;
- publish only after the Next.js app exists;
- squash early bootstrap history before publication.

Outcome:

ForgePilot is published publicly as an early-stage dogfood project. The README explicitly states that the project is in early foundation stage and that application bootstrap starts after TASK-0001.
