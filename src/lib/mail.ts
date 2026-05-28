// SMTP 메일 발송 — Supabase Auth 와 동일한 SMTP 자격증명을 재사용한다 (회원가입 인증용 발송자와 일치).
// 트랜잭션 메일(연체/만료 안내) 용도이며, Vercel Cron 등 서버 환경에서만 호출.
// 필요 env: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM
// (선택) SMTP_SECURE=true → 465 implicit TLS. 미설정 시 PORT=465 → secure, 그 외 STARTTLS.
import nodemailer, { type Transporter } from "nodemailer";

type MailerConfig = {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
  secure: boolean;
};

function readConfig(): MailerConfig {
  const host = process.env.SMTP_HOST;
  const portStr = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM;
  const secureEnv = process.env.SMTP_SECURE;

  if (!host || !portStr || !user || !pass || !from) {
    throw new Error(
      "SMTP_NOT_CONFIGURED: SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS/SMTP_FROM env 필요",
    );
  }
  const port = Number(portStr);
  if (!Number.isFinite(port) || port <= 0) {
    throw new Error("SMTP_PORT_INVALID");
  }
  const secure = secureEnv ? secureEnv === "true" : port === 465;
  return { host, port, user, pass, from, secure };
}

let cached: Transporter | null = null;

function getTransporter(): Transporter {
  if (cached) return cached;
  const cfg = readConfig();
  cached = nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    auth: { user: cfg.user, pass: cfg.pass },
  });
  return cached;
}

export type SendMailInput = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

export async function sendMail(input: SendMailInput): Promise<void> {
  const cfg = readConfig();
  const t = getTransporter();
  await t.sendMail({
    from: cfg.from,
    to: input.to,
    subject: input.subject,
    text: input.text,
    html: input.html,
  });
}
