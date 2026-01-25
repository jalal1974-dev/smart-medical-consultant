/**
 * WhatsApp Notification Helper
 * Sends notifications to admin WhatsApp number when new consultations are submitted
 */

const ADMIN_WHATSAPP = "00962777066005";

interface ConsultationNotification {
  patientName: string;
  symptoms: string;
  consultationId: number;
}

/**
 * Send WhatsApp notification to admin about new consultation
 * Uses CallMeBot API for simple WhatsApp notifications
 * Note: For production, consider using Twilio or WhatsApp Business API
 */
export async function sendConsultationWhatsAppNotification(data: ConsultationNotification): Promise<boolean> {
  try {
    const message = `🏥 *New Consultation Submitted*\n\n` +
      `👤 Patient: ${data.patientName}\n` +
      `🆔 Consultation ID: ${data.consultationId}\n` +
      `💬 Main Symptoms:\n${data.symptoms}\n\n` +
      `Please review and respond as soon as possible.`;

    // Using CallMeBot API (free service for personal WhatsApp notifications)
    // Note: The admin needs to register their number with CallMeBot first
    // Instructions: https://www.callmebot.com/blog/free-api-whatsapp-messages/
    const encodedMessage = encodeURIComponent(message);
    const apiKey = process.env.CALLMEBOT_API_KEY || "";
    
    if (!apiKey) {
      console.warn("CALLMEBOT_API_KEY not set. WhatsApp notification skipped.");
      console.log("To enable WhatsApp notifications:");
      console.log("1. Send 'I allow callmebot to send me messages' to +34 644 51 89 05 on WhatsApp");
      console.log("2. Save the API key you receive");
      console.log("3. Add CALLMEBOT_API_KEY to your environment variables");
      return false;
    }

    const url = `https://api.callmebot.com/whatsapp.php?phone=${ADMIN_WHATSAPP}&text=${encodedMessage}&apikey=${apiKey}`;
    
    const response = await fetch(url);
    
    if (response.ok) {
      console.log(`✅ WhatsApp notification sent to ${ADMIN_WHATSAPP}`);
      return true;
    } else {
      console.error(`❌ Failed to send WhatsApp notification: ${response.statusText}`);
      return false;
    }
  } catch (error) {
    console.error("Error sending WhatsApp notification:", error);
    return false;
  }
}
