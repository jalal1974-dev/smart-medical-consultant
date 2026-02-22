import { describe, it, expect } from "vitest";
import { appRouter } from "./routers";
import * as db from "./db";

describe("Material Regeneration System", () => {
  it("should have research router with performDeepResearch mutation", () => {
    expect(appRouter.research).toBeDefined();
    expect(appRouter.research.performDeepResearch).toBeDefined();
  });

  it("should have regenerateConsultationMaterials function in db", () => {
    expect(db.regenerateConsultationMaterials).toBeDefined();
    expect(typeof db.regenerateConsultationMaterials).toBe("function");
  });

  it("should have getAllResearchedTopics function in db", () => {
    expect(db.getAllResearchedTopics).toBeDefined();
    expect(typeof db.getAllResearchedTopics).toBe("function");
  });

  it("should import materialRegenerationService module", async () => {
    const module = await import("./materialRegenerationService");
    expect(module.regenerateMaterialsAfterResearch).toBeDefined();
    expect(typeof module.regenerateMaterialsAfterResearch).toBe("function");
  });
});
