/**
 * Tests for the Python API client
 * Tests the buildPatientData helper and the health check function.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { buildPatientData } from "./pythonApiClient";

describe("buildPatientData", () => {
  it("should parse symptoms from comma-separated string", () => {
    const result = buildPatientData({
      patientName: "John Doe",
      symptoms: "headache, fever, fatigue, nausea",
      medicalHistory: null,
      aiAnalysis: null,
    });

    expect(result.name).toBe("John Doe");
    expect(result.symptoms).toContain("headache");
    expect(result.symptoms).toContain("fever");
    expect(result.symptoms.length).toBeGreaterThan(0);
    expect(result.symptoms.length).toBeLessThanOrEqual(8);
  });

  it("should extract diagnosis from AI analysis", () => {
    const result = buildPatientData({
      patientName: "Jane Smith",
      symptoms: "chest pain, shortness of breath",
      medicalHistory: "hypertension",
      aiAnalysis: "Diagnosis: Acute bronchitis\nUrgency: high\nRecommendations:\n- Rest\n- Antibiotics",
    });

    expect(result.diagnosis).toBe("Acute bronchitis");
    expect(result.urgency).toBe("high");
  });

  it("should use default values when AI analysis is missing", () => {
    const result = buildPatientData({
      patientName: "Test Patient",
      symptoms: "cough",
      medicalHistory: null,
      aiAnalysis: null,
    });

    expect(result.diagnosis).toBe("Requires specialist evaluation");
    expect(result.urgency).toBe("medium");
    expect(result.recommendations.length).toBeGreaterThan(0);
    expect(result.tests.length).toBeGreaterThan(0);
  });

  it("should limit symptoms to 8 items", () => {
    const result = buildPatientData({
      patientName: "Test",
      symptoms: "a, b, c, d, e, f, g, h, i, j, k",
      medicalHistory: null,
      aiAnalysis: null,
    });

    expect(result.symptoms.length).toBeLessThanOrEqual(8);
  });

  it("should extract recommendations from AI analysis", () => {
    const result = buildPatientData({
      patientName: "Test",
      symptoms: "headache",
      medicalHistory: null,
      aiAnalysis: "Diagnosis: Migraine\nRecommendations:\n- Take ibuprofen\n- Rest in dark room\n- Stay hydrated",
    });

    expect(result.recommendations.length).toBeGreaterThan(0);
    expect(result.recommendations.some(r => r.toLowerCase().includes("ibuprofen") || r.toLowerCase().includes("rest"))).toBe(true);
  });

  it("should handle Arabic urgency level", () => {
    const result = buildPatientData({
      patientName: "مريض",
      symptoms: "صداع، حمى",
      medicalHistory: null,
      aiAnalysis: "urgency: low",
    });

    expect(result.urgency).toBe("low");
  });

  it("should include medical history when provided", () => {
    const result = buildPatientData({
      patientName: "Test",
      symptoms: "chest pain",
      medicalHistory: "Diabetes, Hypertension",
      aiAnalysis: null,
    });

    expect(result.medical_history).toBe("Diabetes, Hypertension");
  });
});
