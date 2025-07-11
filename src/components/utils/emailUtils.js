const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: true,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});

// Function to send email
export const sendEmail = (recipient, subject, text, html) => {
  const mailOptions = {
    from: `${process.env.SMTP_FROM ?? process.env.SMTP_USER}`,
    to: recipient,
    subject,
    text,
    html,
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.log("Error sending email:", error);
    } else {
      console.log("Email sent: " + info.response);
    }
  });
};

export function fillTemplate(template, variables) {
  const escapeRegExp = str => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return Object.entries(variables ?? {}).reduce(
    (acc, [key, value]) => acc.replace(new RegExp(`{{${escapeRegExp(key)}}}`, "g"), value),
    template
  );
}
