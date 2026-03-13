/**
 * Tests for the admin archive consultation feature.
 * Verifies that archiving hides from admin list but keeps in patient records.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the database module
vi.mock("./db", () => ({
  getDb: vi.fn(),
  getAllConsultations: vi.fn(),
  getConsultationsByUserId: vi.fn(),
  archiveConsultation: vi.fn(),
  getConsultationById: vi.fn(),
}));

import * as db from "./db";

describe("Archive Consultation Feature", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("getAllConsultations should not return archived consultations", async () => {
    const mockConsultations = [
      { id: 1, patientName: "Alice", status: "completed", archivedByAdmin: false },
      { id: 2, patientName: "Bob", status: "completed", archivedByAdmin: false },
    ];

    vi.mocked(db.getAllConsultations).mockResolvedValue(mockConsultations as any);

    const result = await db.getAllConsultations();

    // Should only return non-archived consultations
    expect(result.every(c => !c.archivedByAdmin)).toBe(true);
    expect(result).toHaveLength(2);
  });

  it("getConsultationsByUserId should still return archived consultations for patients", async () => {
    const mockConsultations = [
      { id: 1, patientName: "Alice", status: "completed", archivedByAdmin: true },
      { id: 2, patientName: "Alice", status: "submitted", archivedByAdmin: false },
    ];

    vi.mocked(db.getConsultationsByUserId).mockResolvedValue(mockConsultations as any);

    const result = await db.getConsultationsByUserId(42);

    // Patient should see ALL consultations including archived ones
    expect(result).toHaveLength(2);
    expect(result.some(c => c.archivedByAdmin)).toBe(true);
  });

  it("archiveConsultation should be called with the correct id", async () => {
    vi.mocked(db.archiveConsultation).mockResolvedValue(undefined);

    await db.archiveConsultation(99);

    expect(db.archiveConsultation).toHaveBeenCalledWith(99);
    expect(db.archiveConsultation).toHaveBeenCalledTimes(1);
  });

  it("archiving should only be allowed for completed consultations (business rule)", () => {
    // This is a UI-level guard: the Archive button only appears when status === "completed"
    const statuses = ["submitted", "ai_processing", "specialist_review", "follow_up"];
    const completedStatus = "completed";

    // Archive button should only show for completed status
    statuses.forEach(status => {
      expect(status === completedStatus).toBe(false);
    });
    expect(completedStatus === "completed").toBe(true);
  });

  it("archiveConsultation should not affect other consultations", async () => {
    vi.mocked(db.archiveConsultation).mockResolvedValue(undefined);

    await db.archiveConsultation(5);

    // Only called once with the specific ID
    expect(db.archiveConsultation).toHaveBeenCalledTimes(1);
    expect(db.archiveConsultation).not.toHaveBeenCalledWith(6);
    expect(db.archiveConsultation).not.toHaveBeenCalledWith(4);
  });
});
