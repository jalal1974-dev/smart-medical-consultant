import { describe, expect, it, vi } from "vitest";
import { sendConsultationReceipt, sendConsultationStatusUpdate } from "./emailNotifications";
import * as notification from "./_core/notification";

// Mock the notification module
vi.mock("./_core/notification", () => ({
  notifyOwner: vi.fn().mockResolvedValue(true),
}));

describe("Email Notifications", () => {
  describe("sendConsultationReceipt", () => {
    it("sends receipt email in English for free consultation", async () => {
      const result = await sendConsultationReceipt({
        consultationId: 1,
        patientName: "John Doe",
        patientEmail: "john@example.com",
        amount: 0,
        isFree: true,
        preferredLanguage: "en",
        createdAt: new Date("2026-01-15T10:00:00Z"),
        status: "submitted",
      });

      expect(result).toBe(true);
      expect(notification.notifyOwner).toHaveBeenCalledWith(
        expect.objectContaining({
          title: expect.stringContaining("Medical Consultation Receipt #1"),
          content: expect.stringContaining("john@example.com"),
        })
      );
      
      const callArgs = (notification.notifyOwner as any).mock.calls[0][0];
      expect(callArgs.content).toContain("Hello John Doe");
      expect(callArgs.content).toContain("Free");
      expect(callArgs.content).toContain("Submitted");
    });

    it("sends receipt email in Arabic for paid consultation", async () => {
      const result = await sendConsultationReceipt({
        consultationId: 2,
        patientName: "أحمد محمد",
        patientEmail: "ahmed@example.com",
        amount: 5,
        isFree: false,
        preferredLanguage: "ar",
        createdAt: new Date("2026-01-15T10:00:00Z"),
        status: "submitted",
      });

      expect(result).toBe(true);
      expect(notification.notifyOwner).toHaveBeenCalledWith(
        expect.objectContaining({
          title: expect.stringContaining("إيصال استشارة طبية #2"),
          content: expect.stringContaining("ahmed@example.com"),
        })
      );
      
      const callArgs = (notification.notifyOwner as any).mock.calls[1][0];
      expect(callArgs.content).toContain("مرحباً أحمد محمد");
      expect(callArgs.content).toContain("$5");
      expect(callArgs.content).toContain("تم الإرسال");
    });

    it("includes next steps in email", async () => {
      await sendConsultationReceipt({
        consultationId: 3,
        patientName: "Test User",
        patientEmail: "test@example.com",
        amount: 5,
        isFree: false,
        preferredLanguage: "en",
        createdAt: new Date(),
        status: "submitted",
      });

      const callArgs = (notification.notifyOwner as any).mock.calls[2][0];
      expect(callArgs.content).toContain("Next Steps");
      expect(callArgs.content).toContain("AI system will analyze");
      expect(callArgs.content).toContain("medical specialists will review");
      expect(callArgs.content).toContain("detailed medical report");
    });
  });

  describe("sendConsultationStatusUpdate", () => {
    it("sends status update email in English", async () => {
      const result = await sendConsultationStatusUpdate(
        1,
        "John Doe",
        "john@example.com",
        "ai_processing",
        "en"
      );

      expect(result).toBe(true);
      expect(notification.notifyOwner).toHaveBeenCalledWith(
        expect.objectContaining({
          title: expect.stringContaining("Consultation Status Update #1"),
          content: expect.stringContaining("john@example.com"),
        })
      );
      
      const callArgs = (notification.notifyOwner as any).mock.calls[3][0];
      expect(callArgs.content).toContain("Hello John Doe");
      expect(callArgs.content).toContain("AI Processing");
    });

    it("sends status update email in Arabic", async () => {
      const result = await sendConsultationStatusUpdate(
        2,
        "أحمد محمد",
        "ahmed@example.com",
        "specialist_review",
        "ar"
      );

      expect(result).toBe(true);
      expect(notification.notifyOwner).toHaveBeenCalledWith(
        expect.objectContaining({
          title: expect.stringContaining("تحديث حالة الاستشارة #2"),
          content: expect.stringContaining("ahmed@example.com"),
        })
      );
      
      const callArgs = (notification.notifyOwner as any).mock.calls[4][0];
      expect(callArgs.content).toContain("مرحباً أحمد محمد");
      expect(callArgs.content).toContain("مراجعة الأخصائي");
    });

    it("includes special message when consultation is completed", async () => {
      await sendConsultationStatusUpdate(
        3,
        "Test User",
        "test@example.com",
        "completed",
        "en"
      );

      const callArgs = (notification.notifyOwner as any).mock.calls[5][0];
      expect(callArgs.content).toContain("Your detailed medical report is now ready");
      expect(callArgs.content).toContain("dashboard");
    });
  });
});
