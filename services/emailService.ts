export interface EmailPayload {
  to: string;
  subject: string;
  html: string;
}

/**
 * Sends an email using the provided endpoint (e.g., Vercel API with Resend).
 * Ensure you set VITE_EMAIL_API_URL in your .env file or Vercel environment.
 */
export const sendNotificationEmail = async (payload: EmailPayload): Promise<boolean> => {
  const apiUrl = import.meta.env.VITE_EMAIL_API_URL;
  const apiKey = import.meta.env.VITE_EMAIL_API_KEY;

  if (!apiUrl) {
    console.warn("Emails not sent: VITE_EMAIL_API_URL is not set in environment.");
    // Return true in development to not break the flow if it's not configured yet
    return true; 
  }

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (apiKey) {
      headers["Authorization"] = `Bearer ${apiKey}`;
    }

    const response = await fetch(apiUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Failed to send email:", response.status, errorText);
      return false;
    }

    console.log(`Email successfully sent to ${payload.to}`);
    return true;
  } catch (err) {
    console.error("Error calling email API:", err);
    return false;
  }
};
