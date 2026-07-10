export const forgePilotPersistenceModels = [
  "Product",
  "ProductSpec",
  "ForgeTask",
  "Decision",
  "DogfoodingEntry",
  "ProductRelease",
  "HandoffSnapshot",
] as const;

export type ForgePilotPersistenceModel =
  (typeof forgePilotPersistenceModels)[number];
