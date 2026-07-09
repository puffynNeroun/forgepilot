# ForgePilot

ForgePilot is an AI-assisted product development dashboard built through the Project Forge workflow.

The goal of this repository is to dogfood Project Forge v0.5.0 by building a real product with a strict specs-first, task-based, artifact-backed development lifecycle.

## Product idea

ForgePilot helps manage product development through a Forge-style workflow:

- product spec
- task lifecycle board
- decision log
- dogfooding log
- AI handoff prompt generator
- release timeline

## Current phase

Foundation/bootstrap.

The first task is TASK-0001 — define the ForgePilot product spec and architecture.

## Local workflow

Install Forge Validator dependencies:

    pnpm -C tools/forge-validator install --frozen-lockfile

Check lifecycle status:

    node tools/forge-validator/src/cli.mjs status

Run full verification:

    pnpm -C tools/forge-validator verify

## Boundaries

This project is separate from the original Project Forge repository.

Original Forge repo:

    /home/remem/templates/ai-project-template

ForgePilot repo:

    /home/remem/projects/forgepilot
