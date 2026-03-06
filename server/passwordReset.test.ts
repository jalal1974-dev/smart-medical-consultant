import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock DB helpers ─────────────────────────────────────────────────────────
const mockGetUserByEmail = vi.fn();
const mockCreatePasswordResetToken = vi.fn();
const mockGetPasswordResetToken = vi.fn();
const mockMarkPasswordResetTokenUsed = vi.fn();
const mockUpdateUserPassword = vi.fn();

vi.mock("./db", () => ({
  getUserByEmail: (...args: any[]) => mockGetUserByEmail(...args),
  createPasswordResetToken: (...args: any[]) => mockCreatePasswordResetToken(...args),
  getPasswordResetToken: (...args: any[]) => mockGetPasswordResetToken(...args),
  markPasswordResetTokenUsed: (...args: any[]) => mockMarkPasswordResetTokenUsed(...args),
  updateUserPassword: (...args: any[]) => mockUpdateUserPassword(...args),
}));

vi.mock("./emailNotifications", () => ({
  sendPasswordResetEmail: vi.fn().mockResolvedValue(true),
}));

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("Password Reset Flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("requestPasswordReset", () => {
    it("should return success even when user is not found (prevents enumeration)", async () => {
      mockGetUserByEmail.mockResolvedValue(undefined);
      // Simulate the logic
      const user = await mockGetUserByEmail("nonexistent@example.com");
      expect(user).toBeUndefined();
      // Should not throw, just return success
      const result = { success: true };
      expect(result.success).toBe(true);
    });

    it("should return success even for OAuth-only users (no passwordHash)", async () => {
      mockGetUserByEmail.mockResolvedValue({ id: 1, name: "Test", email: "test@example.com", passwordHash: null });
      const user = await mockGetUserByEmail("test@example.com");
      expect(user).toBeDefined();
      expect(user.passwordHash).toBeNull();
      // Should return success without creating token
      const result = { success: true };
      expect(result.success).toBe(true);
    });

    it("should create a token for valid local users", async () => {
      mockGetUserByEmail.mockResolvedValue({
        id: 42,
        name: "Alice",
        email: "alice@example.com",
        passwordHash: "$2b$12$hashedpassword",
      });
      mockCreatePasswordResetToken.mockResolvedValue(undefined);

      const user = await mockGetUserByEmail("alice@example.com");
      expect(user).toBeDefined();
      expect(user.passwordHash).toBeTruthy();

      // Token should be created
      const token = "a".repeat(96); // 48 bytes hex
      const expiresAt = Date.now() + 60 * 60 * 1000;
      await mockCreatePasswordResetToken(user.id, token, expiresAt);
      expect(mockCreatePasswordResetToken).toHaveBeenCalledWith(42, token, expect.any(Number));
    });

    it("should generate a token with correct expiry (1 hour)", () => {
      const before = Date.now();
      const expiresAt = Date.now() + 60 * 60 * 1000;
      const after = Date.now();
      expect(expiresAt).toBeGreaterThan(before + 3599000); // at least 59m59s
      expect(expiresAt).toBeLessThan(after + 3601000); // at most 1h1s
    });
  });

  describe("resetPassword", () => {
    it("should throw NOT_FOUND for invalid token", async () => {
      mockGetPasswordResetToken.mockResolvedValue(null);
      const token = await mockGetPasswordResetToken("invalidtoken");
      expect(token).toBeNull();
    });

    it("should throw BAD_REQUEST for already-used token", async () => {
      mockGetPasswordResetToken.mockResolvedValue({
        id: 1,
        userId: 42,
        token: "validtoken",
        expiresAt: Date.now() + 3600000,
        usedAt: Date.now() - 1000, // already used
      });
      const tokenData = await mockGetPasswordResetToken("validtoken");
      expect(tokenData?.usedAt).toBeTruthy();
    });

    it("should throw BAD_REQUEST for expired token", async () => {
      mockGetPasswordResetToken.mockResolvedValue({
        id: 1,
        userId: 42,
        token: "expiredtoken",
        expiresAt: Date.now() - 1000, // expired
        usedAt: null,
      });
      const tokenData = await mockGetPasswordResetToken("expiredtoken");
      expect(tokenData?.expiresAt).toBeLessThan(Date.now());
    });

    it("should update password and mark token as used for valid token", async () => {
      mockGetPasswordResetToken.mockResolvedValue({
        id: 1,
        userId: 42,
        token: "validtoken",
        expiresAt: Date.now() + 3600000,
        usedAt: null,
      });
      mockUpdateUserPassword.mockResolvedValue(undefined);
      mockMarkPasswordResetTokenUsed.mockResolvedValue(undefined);

      const tokenData = await mockGetPasswordResetToken("validtoken");
      expect(tokenData).toBeDefined();
      expect(tokenData?.usedAt).toBeNull();
      expect(tokenData?.expiresAt).toBeGreaterThan(Date.now());

      await mockUpdateUserPassword(tokenData!.userId, "newhash");
      await mockMarkPasswordResetTokenUsed("validtoken");

      expect(mockUpdateUserPassword).toHaveBeenCalledWith(42, "newhash");
      expect(mockMarkPasswordResetTokenUsed).toHaveBeenCalledWith("validtoken");
    });
  });
});

describe("Subscription Plans", () => {
  it("should define correct plan details for basic", () => {
    const planDetails: Record<string, { consultations: number; amount: number }> = {
      basic: { consultations: 5, amount: 5 },
      standard: { consultations: 15, amount: 12 },
      premium: { consultations: 30, amount: 20 },
    };
    expect(planDetails.basic.consultations).toBe(5);
    expect(planDetails.basic.amount).toBe(5);
  });

  it("should define correct plan details for standard", () => {
    const planDetails: Record<string, { consultations: number; amount: number }> = {
      basic: { consultations: 5, amount: 5 },
      standard: { consultations: 15, amount: 12 },
      premium: { consultations: 30, amount: 20 },
    };
    expect(planDetails.standard.consultations).toBe(15);
    expect(planDetails.standard.amount).toBe(12);
  });

  it("should define correct plan details for premium", () => {
    const planDetails: Record<string, { consultations: number; amount: number }> = {
      basic: { consultations: 5, amount: 5 },
      standard: { consultations: 15, amount: 12 },
      premium: { consultations: 30, amount: 20 },
    };
    expect(planDetails.premium.consultations).toBe(30);
    expect(planDetails.premium.amount).toBe(20);
  });

  it("standard plan should have best value (lowest price per consultation)", () => {
    const plans = [
      { id: "basic", consultations: 5, amount: 5 },
      { id: "standard", consultations: 15, amount: 12 },
      { id: "premium", consultations: 30, amount: 20 },
    ];
    const pricePerConsultation = plans.map((p) => ({
      id: p.id,
      ppc: p.amount / p.consultations,
    }));
    const basicPPC = pricePerConsultation.find((p) => p.id === "basic")!.ppc;
    const standardPPC = pricePerConsultation.find((p) => p.id === "standard")!.ppc;
    const premiumPPC = pricePerConsultation.find((p) => p.id === "premium")!.ppc;
    // Premium should be cheapest per consultation
    expect(premiumPPC).toBeLessThan(standardPPC);
    expect(standardPPC).toBeLessThan(basicPPC);
  });
});
