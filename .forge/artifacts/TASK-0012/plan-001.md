---
schema_version: 1
task_id: TASK-0012
artifact_type: plan
attempt: 1
producing_role: planner
outcome: READY_FOR_APPROVAL
input_artifacts:
  []
---

# TASK-0012 Plan — Dogfooding Insights MVP

## Summary

Добавить read-only страницу `/insights`, которая превращает существующие
`DogfoodingEntry` в детерминированную и объяснимую аналитическую сводку.

AI, external API, database writes, schema changes и dependency changes
в рамках задачи запрещены.

## Architecture

- `lib/db/insights.ts` — только Prisma reads и mapping данных.
- `lib/insights/analyze-dogfooding.ts` — чистая deterministic logic.
- `app/insights/page.tsx` — dynamic route и обработка состояний.
- `app/insights/loading.tsx` — loading state.
- `components/insights/DogfoodingInsights.tsx` — read-only UI.
- `app/page.tsx` — ссылка на `/insights`.

Prisma, анализ и React rendering должны оставаться разделёнными.

## Data

Загрузить demo product со slug `forgepilot`.

Читать поля:

- id;
- title;
- observation;
- friction;
- resolution;
- forgeImprovement;
- severity;
- createdAt;
- updatedAt.

Derived insights не сохраняются в PostgreSQL.

## Classification

Каждая запись получает ровно одну категорию.

Фиксированный приоритет правил:

1. `copy_paste_corruption`
2. `artifact_contract`
3. `workflow_state`
4. `cli_ergonomics`
5. `validation_quality`
6. `environment_database`
7. `documentation_usability`
8. `other`

Первое совпавшее правило побеждает.

Результат должен содержать category, rule identifier, label и matched evidence.

## Aggregation

Страница показывает:

- total entries;
- severity breakdown;
- category breakdown;
- top recurring frictions;
- suggested improvements.

Severity weights:

- critical = 4;
- high = 3;
- medium = 2;
- low = 1.

Recurring frictions и suggestions сортируются детерминированно.
Показывается не более пяти элементов в каждой группе.

## UI states

Обязательные состояния:

- ready;
- empty;
- missing product;
- database error;
- loading.

Route должен использовать:

- `export const dynamic = "force-dynamic"`
- `export const runtime = "nodejs"`

## Documentation

Обновить README, ARCHITECTURE, MVP_SCOPE и DOGFOODING_LOG.

Явно указать, что данные пока поступают из PostgreSQL demo records и не
синхронизированы с реальными Forge files.

## Verification

Проверить:

- `pnpm forge:verify`;
- `pnpm db:validate`;
- `pnpm db:generate`;
- `pnpm lint`;
- `pnpm typecheck`;
- `pnpm build`;
- `pnpm verify`;
- `docker compose config --quiet`;
- dynamic `/insights` route;
- отсутствие Prisma mutations;
- отсутствие изменений protected files.

## Acceptance criteria

AC-01 — dynamic route и ссылка с home page.

AC-02 — Prisma reads изолированы в `lib/db/insights.ts`.

AC-03 — анализ изолирован от Prisma и React.

AC-04 — одна объяснимая категория для каждой записи.

AC-05 — totals, breakdowns, recurring frictions и suggestions.

AC-06 — derived data не сохраняются.

AC-07 — все обязательные UI states реализованы.

AC-08 — нет AI, API, CRUD, schema, dependency, deployment или release work.

AC-09 — документация обновлена.

AC-10 — полный Forge lifecycle и зелёный `pnpm verify`.

## Risks

- Пересекающиеся keywords требуют фиксированного приоритета.
- Free-text может дробить одинаковые проблемы на разные группы.
- Suggestions должны быть помечены как rule-derived, а не AI-generated.
- PostgreSQL остаётся отдельным source of truth от Forge repository.
