# ForgePilot MVP Scope

## MVP goal

Ship ForgePilot v0.1.0 as a small but real dashboard that proves Project Forge can guide production-minded AI-assisted development.

The MVP must be useful for managing ForgePilot itself.

## In scope for v0.1.0

### Product dashboard

Must show:

- product name;
- product stage;
- product goal;
- repository link;
- current release;
- current task summary.

### Product spec editor

Must support structured sections:

- problem;
- target user;
- value proposition;
- MVP scope;
- non-goals;
- success criteria;
- technical stack;
- risks.

### Task lifecycle board

Must show tasks grouped by status:

- proposed;
- approved;
- in_progress;
- ready_for_pr;
- completed.

Manual task data is acceptable for v0.1.0.

### Decision log

Must support creating and viewing decisions with:

- title;
- decision;
- rationale;
- alternatives;
- date;
- optional related task.

### Dogfooding log

Must support creating and viewing dogfooding entries with:

- title;
- observation;
- friction;
- resolution;
- potential Forge improvement;
- severity;
- optional related task.

### Handoff prompt generator

Must generate a copyable prompt that includes:

- product state;
- current task;
- recent decisions;
- dogfooding findings;
- known issues;
- next steps;
- workflow restrictions.

### Release timeline

Must show releases with:

- version;
- date;
- title;
- highlights;
- optional GitHub release URL.

### Demo/seed data

Seed data is allowed if it makes the MVP easier to demonstrate.

## Out of scope for v0.1.0

- authentication;
- teams;
- billing;
- OAuth;
- GitHub import automation;
- background jobs;
- production deployment;
- public SaaS infrastructure;
- complex permissions;
- AI agent execution;
- automatic branch/PR/release operations;
- multiple organizations/workspaces.

## MVP quality bar

ForgePilot v0.1.0 should feel like a real product foundation, not a throwaway prototype.

Minimum quality expectations:

- clear navigation;
- readable UI;
- validated forms;
- stable local setup;
- reproducible commands;
- documented architecture;
- useful README;
- no fake SaaS complexity.

## Task roadmap

### TASK-0001 — Define ForgePilot product spec and architecture

Documentation-only foundation.

### TASK-0002 — Bootstrap Next.js app with CI and base layout

Create the application shell, base routes, tooling, and initial checks.

### TASK-0003 — Add database schema for products, tasks, decisions, dogfooding entries, handoff snapshots, and releases

Introduce Prisma/PostgreSQL and seed data.

### TASK-0004 — Implement product dashboard and product spec editor

Build the first real product views.

### TASK-0005 — Implement task lifecycle board

Add task status visualization and basic task management.

### TASK-0006 — Implement decision log and dogfooding log

Add the reasoning and dogfooding capture layer.

### TASK-0007 — Implement handoff prompt generator

Generate copyable AI handoff prompts from product state.

### TASK-0008 — Implement release timeline

Show product release history.

### TASK-0009 — Polish demo data, README, and local setup

Make the project understandable and demo-ready.

### TASK-0010 — Release ForgePilot v0.1.0

Prepare release notes and cut the first release.

## MVP exit criteria

ForgePilot v0.1.0 can be considered complete when:

- all core modules exist at basic useful quality;
- local setup works from README;
- the handoff prompt generator produces a useful prompt;
- dogfooding findings are recorded;
- the release timeline includes v0.1.0;
- Forge workflow has been used consistently cho "== 5) Update DECISIONS.md =="
cat > docs/DECISIONS.md <<'EOF'
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

## TASK-0002 bootstrap boundary

TASK-0002 creates only the application shell, scripts, and CI.

It must not implement the product dashboard, database schema, product spec editor, task board, decision log, dogfooding UI, handoff generator, or release timeline.

Those modules remain assigned to later MVP tasks.
