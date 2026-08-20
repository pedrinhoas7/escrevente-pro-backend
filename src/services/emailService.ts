import { Resend } from 'resend';
import dotenv from 'dotenv';

dotenv.config();

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = 'Escrevente Pro <no-reply@escrevente.pro>';

const emailTemplate = (nome: string, link: string, tipo: 'convite' | 'reset') => {
    const titulo = tipo === 'convite' ? 'Bem-vindo ao Escrevente Pro' : 'Redefina sua senha';
    const subtitulo = tipo === 'convite'
        ? 'Sua conta foi criada! Defina sua senha para acessar o sistema.'
        : 'Recebemos uma solicitação para redefinir sua senha. Clique no botão abaixo para criar uma nova.';
    const botao = tipo === 'convite' ? 'Definir minha senha' : 'Redefinir senha';

    return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${titulo}</title>
</head>
<body style="margin:0;padding:0;background-color:#faf9f6;font-family:'Inter',Helvetica,Arial,sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#faf9f6;padding:40px 20px;">
        <tr>
            <td align="center">
                <table width="560" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:16px;border:1px solid rgba(226,232,240,0.8);box-shadow:0 20px 25px rgba(226,232,240,0.5);overflow:hidden;">

                    <tr>
                        <td style="background-color:#112752;padding:32px 40px;text-align:center;">
                            <div style="display:inline-flex;align-items:center;gap:12px;">
                                <div style="width:40px;height:40px;background-color:#ffffff;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:bold;color:#112752;">E</div>
                                <div style="text-align:left;">
                                    <p style="margin:0;font-size:16px;font-weight:700;color:#ffffff;font-family:'Libre Caslon Text',serif;letter-spacing:-0.01em;">Cartorial Tech</p>
                                    <p style="margin:0;font-size:12px;color:rgba(255,255,255,0.7);">Sistema Notarial</p>
                                </div>
                            </div>
                        </td>
                    </tr>

                    <tr>
                        <td style="padding:48px 40px 24px 40px;">
                            <h1 style="margin:0 0 8px 0;font-size:24px;font-weight:600;color:#112752;font-family:'Libre Caslon Text',serif;">${titulo}</h1>
                            <p style="margin:0;font-size:16px;color:#44464f;line-height:1.5;">Olá, <strong style="color:#112752;">${nome}</strong>.</p>
                            <p style="margin:12px 0 0 0;font-size:16px;color:#44464f;line-height:1.5;">${subtitulo}</p>
                        </td>
                    </tr>

                    <tr>
                        <td style="padding:8px 40px 32px 40px;">
                            <a href="${link}" style="display:inline-block;background-color:#112752;color:#ffffff;padding:16px 32px;border-radius:12px;font-size:14px;font-weight:600;text-decoration:none;letter-spacing:0.03em;">
                                ${botao}
                            </a>
                        </td>
                    </tr>

                    <tr>
                        <td style="padding:0 40px 32px 40px;">
                            <p style="margin:0;font-size:13px;color:#767780;line-height:1.5;">
                                Se o botão não funcionar, copie e cole o link abaixo no seu navegador:
                            </p>
                            <p style="margin:8px 0 0 0;font-size:13px;color:#767780;word-break:break-all;">
                                <a href="${link}" style="color:#CFB53B;text-decoration:none;">${link}</a>
                            </p>
                        </td>
                    </tr>

                    <tr>
                        <td style="padding:24px 40px;border-top:1px solid rgba(226,232,240,0.8);background-color:#faf9f6;">
                            <p style="margin:0;font-size:12px;color:#767780;text-align:center;line-height:1.5;">
                                Se você não solicitou esta ação, ignore este email.<br>
                                © 2024 Cartorial Tech. Sistema Notarial Avançado.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`;
};

export const enviarEmail = async (
    to: string,
    nome: string,
    link: string,
    tipo: 'convite' | 'reset'
) => {
    const titulo = tipo === 'convite' ? 'Bem-vindo ao Escrevente Pro' : 'Redefinição de senha';

    await resend.emails.send({
        from: FROM_EMAIL,
        to,
        subject: titulo,
        html: emailTemplate(nome, link, tipo),
    });
};