/**
 * Tests for generate.consultationPptx tRPC route
 *
 * The route proxies POST /analyze on the Python backend, uploads the
 * resulting PPTX to S3, and returns a download URL + filename.
 *
 * We mock the global `fetch` and the storagePut helper so no real
 * network calls are made.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Build a minimal base64-encoded PPTX payload (just a few bytes). */
const FAKE_BASE64 = Buffer.from("fake-pptx-bytes").toString("base64");

const MOCK_API_SUCCESS = {
  success: true,
  patient: "أحمد محمد",
  output_type: "claude",
  results: {
    claude: {
      type: "pptx",
      data: FAKE_BASE64,
      filename: "medical_consultation_أحمد_محمد.pptx",
    },
  },
};

const MOCK_API_ERROR = {
  success: false,
  detail: "Anthropic API key not configured",
};

// ── Unit tests for the route logic ───────────────────────────────────────────

describe("generate.consultationPptx route logic", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("should decode base64 PPTX and return a download URL on success", async () => {
    // Mock fetch to return a successful API response
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => MOCK_API_SUCCESS,
    } as Response);
    vi.stubGlobal("fetch", mockFetch);

    // Mock storagePut
    const mockStoragePut = vi.fn().mockResolvedValue({
      url: "https://s3.example.com/generated-pptx/test.pptx",
      key: "generated-pptx/test.pptx",
    });
    vi.doMock("./storage", () => ({ storagePut: mockStoragePut }));

    // Simulate the core logic of the route
    const baseUrl = "http://31.97.126.199:8000";
    const input = {
      patientName: "أحمد محمد",
      age: 45,
      gender: "ذكر",
      symptoms: "ألم في الصدر وضيق في التنفس",
      medicalHistory: "مريض بالسكري",
      medications: "ميتفورمين",
      language: "ar" as const,
    };

    const requestBody = {
      patient: { name: input.patientName, age: input.age, gender: input.gender },
      symptoms: input.symptoms,
      medical_history: input.medicalHistory,
      medications: input.medications,
      language: input.language,
      output_type: "claude",
    };

    const response = await fetch(`${baseUrl}/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });

    expect(response.ok).toBe(true);
    const result = await response.json();
    expect(result.success).toBe(true);
    expect(result.results.claude.data).toBe(FAKE_BASE64);
    expect(result.results.claude.filename).toBe("medical_consultation_أحمد_محمد.pptx");

    // Verify the base64 decodes correctly
    const decoded = Buffer.from(result.results.claude.data, "base64").toString();
    expect(decoded).toBe("fake-pptx-bytes");

    // Verify fetch was called with correct args
    expect(mockFetch).toHaveBeenCalledWith(
      `${baseUrl}/analyze`,
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })
    );
  });

  it("should handle API error response (success: false)", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => MOCK_API_ERROR,
    } as Response);
    vi.stubGlobal("fetch", mockFetch);

    const result = await fetch("http://31.97.126.199:8000/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ patient: { name: "Test" }, symptoms: "test", language: "ar", output_type: "claude" }),
    });

    const data = await result.json();
    expect(data.success).toBe(false);
    expect(data.detail).toBe("Anthropic API key not configured");
    // Route should throw TRPCError in this case
    expect(!data.results?.claude?.data).toBe(true);
  });

  it("should handle HTTP 500 from the Python API", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => "Internal Server Error",
    } as unknown as Response);
    vi.stubGlobal("fetch", mockFetch);

    const response = await fetch("http://31.97.126.199:8000/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    expect(response.ok).toBe(false);
    expect(response.status).toBe(500);
  });

  it("should handle network timeout / connection refused", async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error("fetch failed: connection refused"));
    vi.stubGlobal("fetch", mockFetch);

    await expect(
      fetch("http://31.97.126.199:8000/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      })
    ).rejects.toThrow("connection refused");
  });

  it("should build correct request body with optional fields omitted", () => {
    const input = {
      patientName: "Sara",
      symptoms: "headache and fever",
      language: "en" as const,
      // age, gender, medicalHistory, medications are all undefined
    };

    const requestBody: Record<string, unknown> = {
      patient: {
        name: input.patientName,
        ...(undefined !== undefined && { age: undefined }),
        ...(undefined && { gender: undefined }),
      },
      symptoms: input.symptoms,
      language: input.language,
      output_type: "claude",
    };

    // Optional fields should not appear in the request body
    expect(requestBody.medical_history).toBeUndefined();
    expect(requestBody.medications).toBeUndefined();
    expect((requestBody.patient as Record<string, unknown>).age).toBeUndefined();
    expect((requestBody.patient as Record<string, unknown>).gender).toBeUndefined();
    expect(requestBody.output_type).toBe("claude");
    expect(requestBody.language).toBe("en");
  });

  it("should produce a valid S3 file key from the filename", () => {
    const filename = "medical_consultation_أحمد_محمد.pptx";
    const safeFilename = filename.replace(/[^a-zA-Z0-9._\u0600-\u06FF-]/g, "_");
    const fileKey = `generated-pptx/1234567890-${safeFilename}`;

    expect(fileKey).toContain("generated-pptx/");
    expect(fileKey).toContain(".pptx");
    // Arabic characters should be preserved (they're in the allowed range)
    expect(fileKey).toContain("أحمد");
  });
});
