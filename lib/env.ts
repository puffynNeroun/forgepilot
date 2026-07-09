export const DEFAULT_DATABASE_URL =
  "postgresql://forgepilot:forgepilot@localhost:5434/forgepilot?schema=public";

export function getDatabaseUrl() {
  return process.env.DATABASE_URL ?? DEFAULT_DATABASE_URL;
}
