import { describe, it, expect } from "vitest";

describe("Python API health check", () => {
  it("should reach the Python FastAPI server health endpoint", async () => {
    const apiUrl = process.env.PYTHON_API_URL || "http://localhost:8000";
    const res = await fetch(`${apiUrl}/health`);
    expect(res.ok).toBe(true);
    const json = await res.json() as { status: string; anthropic_configured: boolean };
    expect(json.status).toBe("healthy");
    expect(json.anthropic_configured).toBe(true);
  });
});
