import { describe, it, expect } from "vitest";
import { appRouter } from "./routers";

describe("Slide Generation Request System", () => {
  it("should have slideGeneration router", () => {
    expect(appRouter.slideGeneration).toBeDefined();
  });

  it("should have requestGeneration mutation", () => {
    expect(appRouter.slideGeneration.requestGeneration).toBeDefined();
  });

  it("should have getPendingRequests query", () => {
    expect(appRouter.slideGeneration.getPendingRequests).toBeDefined();
  });

  it("should have getRequestStatus query", () => {
    expect(appRouter.slideGeneration.getRequestStatus).toBeDefined();
  });
});
