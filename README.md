# ForgePilot

ForgePilot is an AI-assisted product development dashboard built through the Project Forge workflow.

It is the first dogfood product for Project Forge v0.5.0.

## Purpose

ForgePilot exists to answer one practical question:

Can Project Forge guide the development of a real product from product spec to release without the workflow becoming chaotic?

## Current status

ForgePilot is in early dogfood stage.

Completed:

- TASK-0001 — product spec and architecture foundation.

Current focus:

- TASK-0002 — Next.js app shell, base layout, scripts, and CI.

No product feature modules are implemented yet.

## Product idea

ForgePilot helps manage AI-assisted product development through:

- product spec;
- task lifecycle board;
- decision log;
- dogfooding log;
- handoff prompt generator;
- release timeline.

## Local setup

Install dependencies:

    pnpm install

Run the development server:

    pnpm dev

Run full verification:

    pnpm verify

Run Forge contract validation only:

    pnpm forge:verify

Run app checks only:

    pnpm app:verify

Build the app:

    pnpm build

## Repository boundaries

Original Forge repo:

    /home/remem/templates/ai-project-template

ForgePilot repo:

    /home/remem/projects/forgepilot

These repositories must stay separate.

## Important verification note

ForgePilot is a consumer project.

For ForgePilot, Forge validation checks the project contract and lifecycle artifacts. Internal Forge Validator test suites are not part of ForgePilot verification.

## Planned MVP modules

- Product dashboard
- Product spec editor
- Task lifecycle board
- Decision log
- Dogfooding log
- Handoff prompt generator
- Release timeline

## Out of scope for v0.1.0

- auth;
- teams;
- billing;
- OAuth;
- GitHub import automation;
- public SaaS infrastructure;
- AI agent execution.
