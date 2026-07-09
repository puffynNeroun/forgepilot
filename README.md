# ForgePilot

ForgePilot is an AI-assisted product development dashboard built through the Project Forge workflow.

It is the first dogfood product for Project Forge v0.5.0.

## Purpose

ForgePilot exists to answer one practical question:

Can Project Forge guide the development of a real product from product spec to release without the workflow becoming chaotic?

## Product idea

ForgePilot helps manage AI-assisted product development through:

- product spec;
- task lifecycle board;
- decision log;
- dogfooding log;
- handoff prompt generator;
- release timeline.

## Current phase

TASK-0001 is defining the product specification and architecture.

No Next.js application has been created yet.

## Repository boundaries

Original Forge repo:

    /home/remem/templates/ai-project-template

ForgePilot repo:

    /home/remem/projects/forgepilot

These repositories must stay separate.

## Local Forge workflow

Install Forge Validator dependencies:

    pnpm -C tools/forge-validator install --frozen-lockfile

Check lifecycle status:

    node tools/forge-validator/src/cli.mjs status

Run ForgePilot contract verification:

    pnpm -C tools/forge-validator verify

Show next recommended action:

    node tools/forge-validator/src/cli.mjs next

## Important note about verification

ForgePilot is a consumer project.

For ForgePilot, `verify` runs Forge contract validation only. It does not run the original Forge Validator internal test suite.

## Current task

TASK-0001 — Define ForgePilot product spec and architecture.

Status:

    approved

Next expected lifecycle step:

    Builder

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
