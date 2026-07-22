import nodemailer from "nodemailer";
import { env } from "../config/env";
import logger from "./logger";

const transporter = nodemailer.createTransport({
  host: env.smtpHost,
  port: env.smtpPort,
  secure: false,
  auth: {
    user: env.smtpUser,
    pass: env.smtpPass,
  },
});

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

export const sendEmail = async (options: EmailOptions): Promise<boolean> => {
  try {
    await transporter.sendMail({
      from: `"Lexora IELTS" <${env.emailFrom}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
    });
    logger.info(`Email sent to ${options.to}`);
    return true;
  } catch (error) {
    logger.error("Email send failed:", error);
    return false;
  }
};

export const sendOTPEmail = async (
  to: string,
  otp: string,
): Promise<boolean> => {
  return sendEmail({
    to,
    subject: "Lexora IELTS - Your Login OTP",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Lexora IELTS Platform</h2>
        <p>Your one-time verification code is:</p>
        <div style="background: #f3f4f6; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #1e40af;">${otp}</span>
        </div>
        <p style="color: #6b7280; font-size: 14px;">This code expires in 5 minutes. Do not share it with anyone.</p>
      </div>
    `,
  });
};

export const sendReviewCompleteEmail = async (
  to: string,
  testType: string,
): Promise<boolean> => {
  return sendEmail({
    to,
    subject: "Lexora IELTS - Your Review is Complete",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Review Completed!</h2>
        <p>Your <strong>${testType}</strong> review has been completed by our expert reviewer.</p>
        <p>Log in to your dashboard to view your band score and detailed feedback.</p>
        <a href="${env.frontendUrl}/review-status" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin-top: 16px;">View Results</a>
      </div>
    `,
  });
};
