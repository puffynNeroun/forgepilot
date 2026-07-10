import { prisma } from "../prisma";

export const DEMO_PRODUCT_SLUG = "forgepilot";

export type TaskStatusKey =
  | "proposed"
  | "approved"
  | "in_progress"
  | "ready_for_pr"
  | "completed"
  | "cancelled"
  | "unknown";

export type TaskBoardTask = {
  id: string;
  displayId: string;
  title: string;
  summary: string | null;
  status: TaskStatusKey;
  rawStatus: string;
  branchName: string | null;
  pullRequestUrl: string | null;
  createdAt: string;
  updatedAt: string;
};

export type TaskBoardCounts = {
  total: number;
  active: number;
  readyForPr: number;
  completed: number;
};

export type TaskBoardReadyData = {
  status: "ready";
  product: {
    id: string;
    name: string;
    slug: string;
    summary: string;
  };
  tasks: TaskBoardTask[];
  counts: TaskBoardCounts;
};

export type TaskBoardData =
  | TaskBoardReadyData
  | { status: "missing_product"; productSlug: string }
  | {
      status: "empty";
      product: {
        id: string;
        name: string;
        slug: string;
        summary: string;
      };
    }
  | { status: "database_error"; message: string };

const statusOrder: Record<TaskStatusKey, number> = {
  proposed: 10,
  approved: 20,
  in_progress: 30,
  ready_for_pr: 40,
  completed: 50,
  cancelled: 60,
  unknown: 70,
};

function normalizeStatus(value: string): TaskStatusKey {
  const normalized = value.toLowerCase();

  if (
    normalized === "proposed" ||
    normalized === "approved" ||
    normalized === "in_progress" ||
    normalized === "ready_for_pr" ||
    normalized === "completed" ||
    normalized === "cancelled"
  ) {
    return normalized;
  }

  return "unknown";
}

function createCounts(tasks: TaskBoardTask[]): TaskBoardCounts {
  return {
    total: tasks.length,
    active: tasks.filter((task) =>
      ["proposed", "approved", "in_progress"].includes(task.status),
    ).length,
    readyForPr: tasks.filter((task) => task.status === "ready_for_pr").length,
    completed: tasks.filter((task) => task.status === "completed").length,
  };
}

export async function getTaskBoardData(): Promise<TaskBoardData> {
  try {
    const product = await prisma.product.findUnique({
      where: { slug: DEMO_PRODUCT_SLUG },
      select: {
        id: true,
        name: true,
        slug: true,
        summary: true,
      },
    });

    if (!product) {
      return {
        status: "missing_product",
        productSlug: DEMO_PRODUCT_SLUG,
      };
    }

    const taskRows = await prisma.forgeTask.findMany({
      where: { productId: product.id },
      orderBy: [{ order: "asc" }, { updatedAt: "desc" }],
      select: {
        id: true,
        externalId: true,
        title: true,
        status: true,
        summary: true,
        branchName: true,
        pullRequestUrl: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const tasks = taskRows
      .map((task): TaskBoardTask => {
        const rawStatus = task.status.toString();
        const status = normalizeStatus(rawStatus);

        return {
          id: task.id,
          displayId: task.externalId,
          title: task.title,
          summary: task.summary,
          status,
          rawStatus,
          branchName: task.branchName,
          pullRequestUrl: task.pullRequestUrl,
          createdAt: task.createdAt.toISOString(),
          updatedAt: task.updatedAt.toISOString(),
        };
      })
      .sort((left, right) => {
        const statusDelta = statusOrder[left.status] - statusOrder[right.status];

        if (statusDelta !== 0) {
          return statusDelta;
        }

        return right.updatedAt.localeCompare(left.updatedAt);
      });

    if (tasks.length === 0) {
      return {
        status: "empty",
        product,
      };
    }

    return {
      status: "ready",
      product,
      tasks,
      counts: createCounts(tasks),
    };
  } catch (error) {
    return {
      status: "database_error",
      message:
        error instanceof Error ? error.message : "Unknown database error.",
    };
  }
}
