export const insightCategories = [
  "copy_paste_corruption",
  "artifact_contract",
  "workflow_state",
  "cli_ergonomics",
  "validation_quality",
  "environment_database",
  "documentation_usability",
  "other",
] as const;

export type InsightCategory = (typeof insightCategories)[number];
export type InsightSeverity = "critical" | "high" | "medium" | "low";

export type DogfoodingInsightSource = {
  id: string;
  title: string;
  observation: string;
  friction: string | null;
  resolution: string | null;
  forgeImprovement: string | null;
  severity: string;
  createdAt: string;
  updatedAt: string;
};

export type InsightBreakdown = {
  key: string;
  label: string;
  count: number;
};

export type ClassifiedDogfoodingEntry = {
  id: string;
  title: string;
  severity: InsightSeverity;
  category: InsightCategory;
  categoryLabel: string;
  ruleId: string;
  ruleLabel: string;
  matchedEvidence: string[];
  explanation: string;
};

export type RecurringFriction = {
  key: string;
  label: string;
  category: InsightCategory;
  count: number;
  severityWeight: number;
  latestUpdatedAt: string;
  explanation: string;
};

export type SuggestedImprovement = {
  text: string;
  count: number;
  severityWeight: number;
  latestUpdatedAt: string;
  source: "recorded" | "category_fallback";
};

export type DogfoodingInsights = {
  totalEntries: number;
  severityBreakdown: InsightBreakdown[];
  categoryBreakdown: InsightBreakdown[];
  recurringFrictions: RecurringFriction[];
  suggestedImprovements: SuggestedImprovement[];
  classifiedEntries: ClassifiedDogfoodingEntry[];
};

type InsightRule = {
  id: string;
  category: Exclude<InsightCategory, "other">;
  label: string;
  terms: string[];
};

const categoryLabels: Record<InsightCategory, string> = {
  copy_paste_corruption: "Copy/paste corruption",
  artifact_contract: "Artifact and contract",
  workflow_state: "Workflow state",
  cli_ergonomics: "CLI ergonomics",
  validation_quality: "Validation quality",
  environment_database: "Environment and database",
  documentation_usability: "Documentation usability",
  other: "Other",
};

const severityOrder: InsightSeverity[] = [
  "critical",
  "high",
  "medium",
  "low",
];

const severityWeights: Record<InsightSeverity, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

const rules: InsightRule[] = [
  {
    id: "copy-paste-corruption",
    category: "copy_paste_corruption",
    label: "Commands or source code are corrupted during copy/paste",
    terms: [
      "copy/paste",
      "copy paste",
      "paste corruption",
      "pasted command",
      "mangled import",
      "broken shell",
      "heredoc",
    ],
  },
  {
    id: "artifact-contract",
    category: "artifact_contract",
    label: "Task or artifact contract is difficult to author correctly",
    terms: [
      "task contract",
      "artifact type",
      "frontmatter",
      "allowed_files",
      "protected_files",
      "required_checks",
      "yaml schema",
    ],
  },
  {
    id: "workflow-state",
    category: "workflow_state",
    label: "Lifecycle state or retry behavior is unclear",
    terms: [
      "lifecycle",
      "status mismatch",
      "stale board",
      "idempotent",
      "idempotency",
      "already completed",
      "ready_for_pr",
      "stage transition",
    ],
  },
  {
    id: "cli-ergonomics",
    category: "cli_ergonomics",
    label: "CLI guidance or recovery path is insufficient",
    terms: [
      "command not found",
      "command-not-found",
      "suggested command",
      "help output",
      "recovery command",
      "low-level error",
      "cli help",
    ],
  },
  {
    id: "validation-quality",
    category: "validation_quality",
    label: "Validation does not represent the real failure mode",
    terms: [
      "false positive",
      "validator",
      "validation",
      "runtime check",
      "integration check",
      "substring check",
      "generated drift",
      "verify",
    ],
  },
  {
    id: "environment-database",
    category: "environment_database",
    label: "Local environment or database setup is unreliable",
    terms: [
      "docker",
      "wsl",
      "postgres",
      "postgresql",
      "prisma",
      "database",
      "container health",
      "database_url",
      "port 5434",
    ],
  },
  {
    id: "documentation-usability",
    category: "documentation_usability",
    label: "Documentation or examples are difficult to use",
    terms: [
      "documentation",
      "missing example",
      "unclear instruction",
      "setup guide",
      "not documented",
      "discoverability",
    ],
  },
];

const fallbackSuggestions: Record<InsightCategory, string> = {
  copy_paste_corruption:
    "Replace fragile multi-step copy/paste blocks with shorter idempotent operator commands.",
  artifact_contract:
    "Provide schema-aware scaffolding and validation guidance for task and artifact contracts.",
  workflow_state:
    "Make lifecycle transitions idempotent and report the current state with a safe recovery path.",
  cli_ergonomics:
    "Improve CLI help, executable discovery, and actionable error recovery instructions.",
  validation_quality:
    "Add semantic and runtime-aware checks instead of broad substring validation.",
  environment_database:
    "Add an idempotent local environment doctor with database health diagnostics.",
  documentation_usability:
    "Add focused examples and recovery-oriented setup documentation.",
  other:
    "Review this finding manually and convert it into a specific product improvement.",
};

function normalizeText(value: string | null | undefined) {
  return (value ?? "").trim().replace(/\s+/g, " ");
}

function searchableText(entry: DogfoodingInsightSource) {
  return [
    entry.title,
    entry.observation,
    entry.friction,
    entry.resolution,
    entry.forgeImprovement,
  ]
    .map(normalizeText)
    .join(" ")
    .toLowerCase();
}

function normalizeSeverity(value: string): InsightSeverity {
  const normalized = value.trim().toLowerCase();

  return severityOrder.includes(normalized as InsightSeverity)
    ? (normalized as InsightSeverity)
    : "medium";
}

function timestamp(value: string) {
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function classify(entry: DogfoodingInsightSource) {
  const text = searchableText(entry);

  for (const rule of rules) {
    const evidence = rule.terms.filter((term) => text.includes(term));

    if (evidence.length > 0) {
      return {
        category: rule.category,
        ruleId: rule.id,
        ruleLabel: rule.label,
        matchedEvidence: evidence,
        explanation: `Matched deterministic terms: ${evidence.join(", ")}.`,
      };
    }
  }

  const fallbackLabel =
    normalizeText(entry.friction) ||
    normalizeText(entry.title) ||
    "Unclassified friction";

  return {
    category: "other" as const,
    ruleId: `other:${fallbackLabel.toLowerCase().slice(0, 64)}`,
    ruleLabel: fallbackLabel.slice(0, 96),
    matchedEvidence: [],
    explanation:
      "No configured keyword rule matched; the entry uses the deterministic fallback category.",
  };
}

export function analyzeDogfooding(
  entries: DogfoodingInsightSource[],
): DogfoodingInsights {
  const classified = entries.map((entry) => {
    const severity = normalizeSeverity(entry.severity);
    const result = classify(entry);

    return {
      entry,
      severity,
      ...result,
    };
  });

  const classifiedEntries: ClassifiedDogfoodingEntry[] = classified.map(
    ({ entry, severity, ...result }) => ({
      id: entry.id,
      title: entry.title,
      severity,
      categoryLabel: categoryLabels[result.category],
      ...result,
    }),
  );

  const severityBreakdown = severityOrder.map((severity) => ({
    key: severity,
    label: severity[0].toUpperCase() + severity.slice(1),
    count: classified.filter((item) => item.severity === severity).length,
  }));

  const categoryBreakdown = insightCategories.map((category) => ({
    key: category,
    label: categoryLabels[category],
    count: classified.filter((item) => item.category === category).length,
  }));

  const frictionGroups = new Map<string, RecurringFriction>();

  for (const item of classified) {
    const current = frictionGroups.get(item.ruleId);
    const weight = severityWeights[item.severity];

    if (current) {
      current.count += 1;
      current.severityWeight += weight;

      if (timestamp(item.entry.updatedAt) > timestamp(current.latestUpdatedAt)) {
        current.latestUpdatedAt = item.entry.updatedAt;
      }

      continue;
    }

    frictionGroups.set(item.ruleId, {
      key: item.ruleId,
      label: item.ruleLabel,
      category: item.category,
      count: 1,
      severityWeight: weight,
      latestUpdatedAt: item.entry.updatedAt,
      explanation: item.explanation,
    });
  }

  const suggestionGroups = new Map<string, SuggestedImprovement>();

  for (const item of classified) {
    const recorded = normalizeText(item.entry.forgeImprovement);
    const text = recorded || fallbackSuggestions[item.category];
    const key = text.toLowerCase();
    const current = suggestionGroups.get(key);
    const weight = severityWeights[item.severity];

    if (current) {
      current.count += 1;
      current.severityWeight += weight;

      if (timestamp(item.entry.updatedAt) > timestamp(current.latestUpdatedAt)) {
        current.latestUpdatedAt = item.entry.updatedAt;
      }

      continue;
    }

    suggestionGroups.set(key, {
      text,
      count: 1,
      severityWeight: weight,
      latestUpdatedAt: item.entry.updatedAt,
      source: recorded ? "recorded" : "category_fallback",
    });
  }

  const rank = (
    left: { count: number; severityWeight: number; latestUpdatedAt: string },
    right: { count: number; severityWeight: number; latestUpdatedAt: string },
  ) =>
    right.count - left.count ||
    right.severityWeight - left.severityWeight ||
    timestamp(right.latestUpdatedAt) - timestamp(left.latestUpdatedAt);

  return {
    totalEntries: entries.length,
    severityBreakdown,
    categoryBreakdown,
    recurringFrictions: [...frictionGroups.values()]
      .sort((left, right) => rank(left, right) || left.label.localeCompare(right.label))
      .slice(0, 5),
    suggestedImprovements: [...suggestionGroups.values()]
      .sort((left, right) => rank(left, right) || left.text.localeCompare(right.text))
      .slice(0, 5),
    classifiedEntries,
  };
}
