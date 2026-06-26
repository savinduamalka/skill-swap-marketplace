import { Resend } from 'resend';

// Initialize Resend client
const resend = new Resend(process.env.RESEND_API_KEY);

// Sender configuration
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL;

/**
 * Base email template wrapper with SkillSwap branding
 */
function getBaseTemplate(content: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SkillSwap</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f4f4f5;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width: 560px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06); overflow: hidden;">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%); padding: 32px 40px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">
                🔄 SkillSwap
              </h1>
              <p style="margin: 8px 0 0; color: rgba(255, 255, 255, 0.85); font-size: 14px; font-weight: 400;">
                Exchange Skills, Build Community
              </p>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 24px 40px; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 8px; color: #6b7280; font-size: 12px; text-align: center; line-height: 1.5;">
                This email was sent by SkillSwap. If you didn't request this, you can safely ignore it.
              </p>
              <p style="margin: 0; color: #9ca3af; font-size: 11px; text-align: center;">
                © ${new Date().getFullYear()} SkillSwap. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Generate password reset email HTML
 */
function getPasswordResetTemplate(resetLink: string, userName?: string): string {
  const greeting = userName ? `Hi ${userName},` : 'Hi there,';

  const content = `
    <h2 style="margin: 0 0 16px; color: #111827; font-size: 22px; font-weight: 600;">
      Reset Your Password 🔑
    </h2>
    <p style="margin: 0 0 16px; color: #374151; font-size: 15px; line-height: 1.6;">
      ${greeting}
    </p>
    <p style="margin: 0 0 24px; color: #374151; font-size: 15px; line-height: 1.6;">
      We received a request to reset your SkillSwap account password. Click the button below to create a new password. This link will expire in <strong>1 hour</strong> for security.
    </p>
    <!-- CTA Button -->
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
      <tr>
        <td align="center" style="padding: 8px 0 32px;">
          <a href="${resetLink}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 16px; font-weight: 600; letter-spacing: 0.2px; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);">
            Reset Password →
          </a>
        </td>
      </tr>
    </table>
    <!-- Security Info -->
    <div style="background-color: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
      <p style="margin: 0 0 8px; color: #0369a1; font-size: 13px; font-weight: 600;">
        🛡️ Security Notice
      </p>
      <p style="margin: 0; color: #0c4a6e; font-size: 13px; line-height: 1.5;">
        If you did not request this password reset, no action is needed — your account is still secure. Never share this link with anyone.
      </p>
    </div>
    <!-- Fallback Link -->
    <p style="margin: 0 0 8px; color: #6b7280; font-size: 13px;">
      If the button doesn't work, copy and paste this link into your browser:
    </p>
    <p style="margin: 0; word-break: break-all; color: #2563eb; font-size: 13px; line-height: 1.5; background: #f9fafb; padding: 12px; border-radius: 6px; border: 1px solid #e5e7eb;">
      ${resetLink}
    </p>
  `;

  return getBaseTemplate(content);
}

/**
 * Send password reset email via Resend
 *
 * @param to - Recipient email address
 * @param resetLink - Full password reset URL with token
 * @param userName - Optional user name for personalized greeting
 * @returns Success status and message ID or error
 */
export async function sendPasswordResetEmail(
  to: string,
  resetLink: string,
  userName?: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [to],
      subject: 'Reset Your SkillSwap Password',
      html: getPasswordResetTemplate(resetLink, userName),
    });

    if (error) {
      console.error('[Email] Resend API error:', error);
      return { success: false, error: error.message };
    }

    console.log(`[Email] Password reset email sent to ${to} (ID: ${data?.id})`);
    return { success: true, messageId: data?.id };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown email error';
    console.error('[Email] Failed to send password reset email:', message);
    return { success: false, error: message };
  }
}
