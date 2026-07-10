import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const slug = "forgepilot";

  const existingProduct = await prisma.product.findUnique({
    where: { slug },
    select: { id: true },
  });

  if (existingProduct) {
    await prisma.product.delete({
      where: { slug },
    });
  }

  await prisma.product.create({
    data: {
      slug,
      name: "ForgePilot",
      summary:
        "Dogfood dashboard for testing Project Forge AI-assisted development workflow.",
      specs: {
        create: [
          {
            title: "ForgePilot MVP product foundation",
            version: 1,
            content:
              "ForgePilot manages product specs, tasks, decisions, dogfooding findings, handoff snapshots, and release timelines.",
          },
        ],
      },
      tasks: {
        create: [
          {
            externalId: "TASK-0001",
            title: "Define ForgePilot product spec and architecture",
            status: "COMPLETED",
            summary: "Defined product foundation and MVP boundaries.",
            order: 1,
          },
          {
            externalId: "TASK-0002",
            title: "Bootstrap Next.js app with CI and base layout",
            status: "COMPLETED",
            summary: "Created the first Next.js application shell.",
            order: 2,
          },
          {
            externalId: "TASK-0003",
            title: "Add database schema for products, tasks, decisions, and releases",
            status: "IN_PROGRESS",
            summary: "Adds Prisma/PostgreSQL persistence foundation.",
            order: 3,
          },
        ],
      },
      decisions: {
        create: [
          {
            title: "Use PostgreSQL with Prisma for the MVP persistence layer",
            context:
              "ForgePilot needs structured data for products, tasks, decisions, releases, and handoff snapshots.",
            decision:
              "Use Prisma with PostgreSQL and keep database-dependent commands separate from the default verify path.",
            consequences:
              "Future feature tasks can rely on typed persistence while CI remains deterministic.",
          },
        ],
      },
      dogfoodingEntries: {
        create: [
          {
            title: "Database bootstrap must not make verify require a running database",
            observation:
              "A local database is useful for future features, but the default verification path should stay fast and deterministic.",
            friction:
              "Database tasks often accidentally couple CI to a local service.",
            resolution:
              "Use Prisma validation and generation in verify, but keep db push and seed as manual local commands.",
            forgeImprovement:
              "Forge task templates could distinguish always-safe checks from local-service checks.",
            severity: "MEDIUM",
          },
        ],
      },
      releases: {
        create: [
          {
            version: "v0.1.0",
            title: "ForgePilot MVP",
            summary:
              "Initial MVP release after dashboard, task board, logs, handoff generator, and release timeline are implemented.",
            status: "PLANNED",
          },
        ],
      },
      handoffSnapshots: {
        create: [
          {
            title: "Initial ForgePilot handoff direction",
            content:
              "Continue development from the current Forge task lifecycle state, preserving decisions, task artifacts, and dogfooding findings.",
          },
        ],
      },
    },
  });

  console.log("Seeded ForgePilot demo data.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
