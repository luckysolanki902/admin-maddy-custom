const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: { user: process.env.NODEMAILER_USER, pass: process.env.NODEMAILER_PASSWORD },
});

// Function to send email
export const sendEmail = (recipient, subject, text, html) => {
  const mailOptions = {
    from: "Maddy Custom",
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
