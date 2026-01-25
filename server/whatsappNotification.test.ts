import { describe, it, expect, vi, beforeEach } from 'vitest';
import { sendConsultationWhatsAppNotification } from './whatsappNotification';

// Mock fetch globally
global.fetch = vi.fn();

describe('WhatsApp Notification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset environment variables
    delete process.env.CALLMEBOT_API_KEY;
  });

  it('should return false when CALLMEBOT_API_KEY is not set', async () => {
    const result = await sendConsultationWhatsAppNotification({
      patientName: 'John Doe',
      symptoms: 'Headache and fever',
      consultationId: 123,
    });

    expect(result).toBe(false);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('should send WhatsApp notification when API key is set', async () => {
    process.env.CALLMEBOT_API_KEY = 'test-api-key-123';
    
    (fetch as any).mockResolvedValueOnce({
      ok: true,
      statusText: 'OK',
    });

    const result = await sendConsultationWhatsAppNotification({
      patientName: 'Jane Smith',
      symptoms: 'Chest pain and shortness of breath',
      consultationId: 456,
    });

    expect(result).toBe(true);
    expect(fetch).toHaveBeenCalledTimes(1);
    
    const callArgs = (fetch as any).mock.calls[0][0];
    expect(callArgs).toContain('api.callmebot.com/whatsapp.php');
    expect(callArgs).toContain('phone=00962777066005');
    expect(callArgs).toContain('apikey=test-api-key-123');
    expect(callArgs).toContain('Jane%20Smith');
    expect(callArgs).toContain('456');
  });

  it('should return false when API request fails', async () => {
    process.env.CALLMEBOT_API_KEY = 'test-api-key-123';
    
    (fetch as any).mockResolvedValueOnce({
      ok: false,
      statusText: 'Bad Request',
    });

    const result = await sendConsultationWhatsAppNotification({
      patientName: 'Bob Johnson',
      symptoms: 'Back pain',
      consultationId: 789,
    });

    expect(result).toBe(false);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('should handle network errors gracefully', async () => {
    process.env.CALLMEBOT_API_KEY = 'test-api-key-123';
    
    (fetch as any).mockRejectedValueOnce(new Error('Network error'));

    const result = await sendConsultationWhatsAppNotification({
      patientName: 'Alice Brown',
      symptoms: 'Nausea',
      consultationId: 999,
    });

    expect(result).toBe(false);
  });

  it('should properly format message with patient details', async () => {
    process.env.CALLMEBOT_API_KEY = 'test-key';
    
    (fetch as any).mockResolvedValueOnce({
      ok: true,
      statusText: 'OK',
    });

    await sendConsultationWhatsAppNotification({
      patientName: 'Test Patient',
      symptoms: 'Multiple symptoms:\n- Fever\n- Cough\n- Fatigue',
      consultationId: 100,
    });

    const callArgs = (fetch as any).mock.calls[0][0];
    // Check that message contains key information
    expect(callArgs).toContain('New%20Consultation');
    expect(callArgs).toContain('Test%20Patient');
    expect(callArgs).toContain('100');
    expect(callArgs).toContain('Symptoms');
  });
});
