import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import * as storage from "./storage";

// Mock the storage module
vi.mock("./storage", () => ({
  storagePut: vi.fn().mockResolvedValue({
    key: "consultations/1/medical_report/test123.pdf",
    url: "https://storage.example.com/consultations/1/medical_report/test123.pdf",
  }),
}));

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };

  return { ctx };
}

describe("File Upload", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("upload.file", () => {
    it("successfully uploads a PDF file", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      // Create a simple base64 encoded PDF content
      const pdfContent = Buffer.from("PDF file content").toString("base64");

      const result = await caller.upload.file({
        fileName: "medical-report.pdf",
        fileType: "application/pdf",
        fileData: pdfContent,
        category: "medical_report",
      });

      expect(result.success).toBe(true);
      expect(result.url).toBe(
        "https://storage.example.com/consultations/1/medical_report/test123.pdf"
      );
      expect(result.fileKey).toBe("consultations/1/medical_report/test123.pdf");
      expect(storage.storagePut).toHaveBeenCalledOnce();
    });

    it("successfully uploads an image file", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const imageContent = Buffer.from("Image file content").toString("base64");

      const result = await caller.upload.file({
        fileName: "xray.jpg",
        fileType: "image/jpeg",
        fileData: imageContent,
        category: "xray",
      });

      expect(result.success).toBe(true);
      expect(result.url).toContain("storage.example.com");
      expect(storage.storagePut).toHaveBeenCalledOnce();
    });

    it("rejects invalid file type", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const content = Buffer.from("File content").toString("base64");

      await expect(
        caller.upload.file({
          fileName: "file.exe",
          fileType: "application/x-msdownload",
          fileData: content,
          category: "medical_report",
        })
      ).rejects.toThrow("Invalid file type");
    });

    it("rejects file exceeding size limit", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      // Create a large file (11MB)
      const largeContent = Buffer.alloc(11 * 1024 * 1024).toString("base64");

      await expect(
        caller.upload.file({
          fileName: "large-file.pdf",
          fileType: "application/pdf",
          fileData: largeContent,
          category: "medical_report",
        })
      ).rejects.toThrow("File size exceeds 10MB limit");
    });

    it("handles all file categories correctly", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const content = Buffer.from("File content").toString("base64");
      const categories: Array<"medical_report" | "lab_result" | "xray" | "other"> = [
        "medical_report",
        "lab_result",
        "xray",
        "other",
      ];

      for (const category of categories) {
        const result = await caller.upload.file({
          fileName: `test-${category}.pdf`,
          fileType: "application/pdf",
          fileData: content,
          category,
        });

        expect(result.success).toBe(true);
        expect(result.url).toContain("storage.example.com");
      }

      expect(storage.storagePut).toHaveBeenCalledTimes(categories.length);
    });

    it("requires authentication", async () => {
      const ctx: TrpcContext = {
        user: null,
        req: {
          protocol: "https",
          headers: {},
        } as TrpcContext["req"],
        res: {
          clearCookie: () => {},
        } as TrpcContext["res"],
      };

      const caller = appRouter.createCaller(ctx);
      const content = Buffer.from("File content").toString("base64");

      await expect(
        caller.upload.file({
          fileName: "test.pdf",
          fileType: "application/pdf",
          fileData: content,
          category: "medical_report",
        })
      ).rejects.toThrow("UNAUTHORIZED");
    });
  });
});
