import nodemailer from 'nodemailer';
import { env } from '../config/env.js';
import { logger } from './logger.js';

function createTransporter() {
	if (!env.EMAIL_HOST || !env.EMAIL_USER || !env.EMAIL_PASSWORD) return null;
	return nodemailer.createTransport({
		host: env.EMAIL_HOST,
		port: env.EMAIL_PORT,
		secure: env.EMAIL_PORT === 465,
		auth: { user: env.EMAIL_USER, pass: env.EMAIL_PASSWORD },
	});
}

const transporter = createTransporter();

export async function sendVerificationEmail(email: string, token: string): Promise<void> {
	if (env.DISABLE_EMAIL) {
		logger.info({ email }, 'Email sending skipped (DISABLE_EMAIL=true)');
		return;
	}

	const verifyUrl = `${env.FRONTEND_URL}/auth/verify-email?token=${token}`;
	const subject = 'Verify your Krydix account';
	const html = `
      <h2>Welcome to Krydix!</h2>
      <p>Click the link below to verify your email address:</p>
      <a href="${verifyUrl}">Verify Email</a>
      <p>This link expires in 24 hours.</p>
    `;

	if (!transporter) {
		logger.info({ email, verifyUrl }, 'Email verification link (no mail transport configured)');
		return;
	}

	await transporter.sendMail({
		from: env.EMAIL_FROM,
		to: email,
		subject,
		html,
	});
}
