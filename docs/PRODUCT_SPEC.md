# ForgePilot Product Spec

## Product summary

ForgePilot is an AI-assisted product development dashboard built through the Project Forge workflow.

It is not a generic todo app. It is a dogfood product designed to prove whether Project Forge v0.5.0 can guide the development of a real product from product spec to release.

## Problem

AI-assisted development often becomes fragmented.

Important product context gets spread across:

- long AI chats;
- markdown notes;
- task files;
- branches;
- pull requests;
- release notes;
- local terminal logs;
- decisions that are remembered only informally.

This creates several problems:

- the AI loses context between chats;
- the developer forgets why decisions were made;
- task status becomes unclear;
- implementation starts before product boundaries are stable;
- releases become hard to explain;
- workflow friction is noticed but not captured.

Project Forge already provides a structured lifecycle for AI-assisted work. ForgePilot turns that workflow into a visible product dashboard and uses its own development process to test where Forge is strong or weak.

## Target user

### Primary user

A solo developer or technical founder who builds products with AI assistance and wants a stricter workflow than a normal todo app.

This user needs help managing:

- product specs;
- task lifecycle;
- architecture notes;
- decision history;
- release planning;
- AI handoff context;
- workflow friction.

### Initial user

The first user is this repository owner.

ForgePilot is initially built to dogfood Project Forge v0.5.0 while creating a real portfolio-quality product.

## Value proposition

ForgePilot helps developers keep AI-assisted product development controlled, auditable, and easier to resume.

It gives one place to see:

- what product is being built;
- what the current scope is;
- what tasks exist;
- what stage each task is in;
- what decisions were made;
- what workflow friction was discovered;
- what releases happened;
- what prompt should be given to a new AI chat.

## MVP scope

ForgePilot v0.1.0 should include seven focused capabilities.

### 1. Product dashboard

Shows the current product/project:

- name;
- stage;
- goal;
- repository link;
- current release;
- short status summary.

### 2. Product spec editor

Allows editing and viewing structured product spec sections:

- problem;
- target user;
- value proposition;
- MVP scope;
- non-goals;
- success criteria;
- technical stack;
- risks.

### 3. Task lifecycle board

Shows tasks across Forge-style statuses:

- proposed;
- approved;
- in_progress;
- ready_for_pr;
- completed.

The board should make task progress visible without replacing the Forge task contract files yet.

### 4. Decision log

Stores product and architecture decisions:

- what was decided;
- why it was decided;
- alternatives considered;
- date.

### 5. Dogfooding log

Records friction discovered while building ForgePilot through Project Forge.

Examples:

- commands are too long;
- bootstrap carries old repo assumptions;
- AI handoff lacks enough context;
- validator misses a real mistake;
- task contracts are too generic;
- PR/release flow feels too heavy for early work.

### 6. Handoff prompt generator

Generates a ready-to-copy prompt for a new AI chat.

The prompt should include:

- product state;
- current task;
- recent commits;
- task board;
- key decisions;
- known issues;
- next commands;
- workflow restrictions.

### 7. Release timeline

Shows release history:

- version;
- date;
- highlights;
- GitHub release link if available.

## Non-goals for v0.1.0

ForgePilot v0.1.0 will not include:

- authentication;
- teams;
- billing;
- OAuth;
- GitHub import automation;
- background jobs;
- multi-tenant SaaS infrastructure;
- complex permissions;
- AI agent execution;
- automatic PR creation;
- automatic release creation;
- production deployment requirements.

## Success criteria

ForgePilot v0.1.0 is successful if:

- it is built through the Forge workflow from task planning to release;
- it demonstrates a real product, not a toy todo app;
- it has a working dashboard for product/task/decision/dogfooding/release data;
- it can generate a useful handoff prompt for a new AI chat;
- its README explains how to run and understand the project;
- dogfooding produces concrete improvement candidates for Project Forge;
- the development workflow remains understandable and reproducible.

## Technical stack

Planned stack:

- Next.js App Router
- TypeScript
- Tailwind CSS
- PostgreSQL
- Prisma
- Zod
- pnpm
- GitHub Actions
- Docker Compose for local PostgreSQL if needed

## Product principles

### Keep the MVP local-first

Do not start with SaaS complexity. Build one useful local product workspace first.

### Make workflow state visible

The dashboard should make Forge-style development easier to understand at a glance.

### Capture decisions early

Decision history is part of the product, not an afterthought.

### Treat dogfooding as a first-class feature

If Forge workflow creates friction while building ForgePilot, that friction must be written down.

### Prefer boring implementation

Use standard Next.js, TypeScript, Prisma, Tailwind, and Zod patterns. Avoid clever abstractions until the product proves they are needed.

## Main risks

### Overbuilding

Risk:

Turning ForgePilot into a SaaS platform before the MVP proves the core workflow.

Mitigation:

Keep v0.1.0 single-workspace and local-first.

### Workflow drag

Risk:

Forge workflow may feel too heavy for early product development.

Mitigation:

Record friction in the dogfooding log and later convert useful findings into Forge improvement tasks.

### Data model over-abstraction

Risk:

Trying to design a universal workflow schema too early.

Mitigation:

Start with concrete ForgePilot entities and evolve only when repeated needs appear.

### Context loss

Risk:

AI chats may still lose important state.

Mitigation:

Make the handoff prompt generator a core MVP feature.
