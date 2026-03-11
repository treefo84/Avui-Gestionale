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

/**
 * Wraps email content into a unified, styled HTML template containing the app link.
 */
export const buildEmailTemplate = (title: string, contentHtml: string): string => {
  return `
    <div style="font-family: 'Inter', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
      <div style="background-color: #0f172a; padding: 24px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700;">⛵ Avui Gestionale</h1>
      </div>
      <div style="padding: 32px 24px; background-color: #ffffff; color: #334155; line-height: 1.6; font-size: 16px;">
        <h2 style="color: #0f172a; margin-top: 0; margin-bottom: 20px;">${title}</h2>
        ${contentHtml}
      </div>
      <div style="background-color: #f8fafc; padding: 24px; text-align: center; border-top: 1px solid #e2e8f0;">
        <p style="margin: 0; color: #64748b; font-size: 14px;">Gestisci i tuoi imbarchi e le tue disponibilità direttamente online.</p>
        <a href="https://www.avui.it/gestionale" style="display: inline-block; margin-top: 16px; padding: 12px 32px; background-color: #2563eb; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px;">Vai all'App</a>
      </div>
    </div>
  `;
};
