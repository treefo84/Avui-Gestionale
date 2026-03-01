export interface EmailPayload {
  to: string;
  subject: string;
  html: string;
}

/**
 * Sends an email using the internal Vercel API Route.
 */
export const sendNotificationEmail = async (payload: EmailPayload): Promise<boolean> => {
  try {
    const response = await fetch("/api/send-email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Failed to send email via /api/send-email:", response.status, errorText);
      return false;
    }

    console.log(`Email successfully forwarded to API for ${payload.to}`);
    return true;
  } catch (err) {
    console.error("Error calling internal email API:", err);
    return false;
  }
};
