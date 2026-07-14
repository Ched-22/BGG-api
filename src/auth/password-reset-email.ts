export function buildPasswordResetEmailSubject(): string {
  return 'Black Gold Garage — Redefinição de senha';
}

export function buildPasswordResetEmailBodies(
  resetUrl: string,
): { text: string; html: string } {
  const text = [
    'Recebemos uma solicitação para redefinir sua senha na Black Gold Garage.',
    '',
    `Para criar uma nova senha, acesse: ${resetUrl}`,
    '',
    'Este link expira em 1 hora. Se você não solicitou essa alteração, ignore este e-mail.',
    '',
    'Black Gold Garage',
  ].join('\n');

  const html = `
<!DOCTYPE html>
<html lang="pt">
  <body style="font-family: Arial, sans-serif; color: #1a1a1a; line-height: 1.5; margin: 0; padding: 24px;">
    <div style="max-width: 560px; margin: 0 auto;">
      <div style="background: #8b7348; color: #fff; padding: 16px 20px; border-radius: 4px 4px 0 0;">
        <div style="font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase; opacity: 0.9;">Black Gold Garage</div>
        <h1 style="margin: 8px 0 0; font-size: 22px;">Redefinição de senha</h1>
      </div>
      <div style="border: 1px solid #e5e7eb; border-top: none; padding: 20px; border-radius: 0 0 4px 4px;">
        <p style="margin: 0 0 16px; font-size: 14px; color: #1a1a1a;">
          Recebemos uma solicitação para redefinir sua senha. Clique no botão abaixo para criar uma nova senha.
        </p>
        <p style="margin: 0 0 20px;">
          <a href="${resetUrl}" style="display: inline-block; background: #8b7348; color: #fff; text-decoration: none; padding: 10px 20px; border-radius: 4px; font-size: 14px; font-weight: 600;">
            Redefinir senha
          </a>
        </p>
        <p style="margin: 0; font-size: 13px; color: #6b7280;">
          Este link expira em 1 hora. Se você não solicitou essa alteração, ignore este e-mail.
        </p>
      </div>
    </div>
  </body>
</html>`.trim();

  return { text, html };
}
