const cron = require("node-cron");
const { connectToDatabase } = require("@/lib/db");
const AdminGoal = require("@/models/admin/AdminGoal");
const { sendEmail, fillTemplate } = require("@/components/utils/emailUtils");
const fs = require("fs");
const path = require("path");

const templatesPath = [__dirname, "..", "..", "..", "..", "src", "templates"];

// Department Admins with email addresses and names
// TODO get departmentAdmins with logic when they are defined
const departmentAdmins = {
  "web-d": { email: "luckysolanki902@gmail.com", name: "Lucky Solanki" },
  design: { email: "i.prashant0323@gmail.com", name: "Prashant Kumar" },
  // finance: { email: "finance-admin@example.com", name: "Finance Department Admin" },
  marketing: { email: "vermatanya187@gmail.com", name: "Tanya Verma" },
  production: { email: "sg.gupta2241@gmail.com", name: "Sumit Gupta" },
};

// Cron job that runs every day at midnight to check for expired deadlines
cron.schedule("0 0 * * *", async () => {
  try {
    // Connect to the database
    await connectToDatabase();

    // Fetch goals where the deadline has passed and is not completed
    const expiredGoals = await AdminGoal.find({
      deadline: { $lte: new Date() }, // Check if the deadline is in the past
      isCompleted: false, // Only check goals that are not completed
    });

    // Read the HTML template from file
    const templatePath = path.resolve(...templatesPath, "goal-deadline-alert.html");

    // Send email for each expired goal
    expiredGoals.forEach(goal => {
      let html = fs.readFileSync(templatePath, "utf8");

      const variables = {
        "Goal Title": goal.title,
        "Goal Description": goal.description,
        "Deadline Date": new Date(goal.deadline).toLocaleDateString(),
        "Action URL": `https://admin-maddycustom.vercel.app/admin/departments/${goal.department}-goals`,
        "Current Year": new Date().getFullYear(),
      };

      // Fill the template with dynamic data
      html = fillTemplate(html, variables);

      // Construct subject and text for the email
      const subject = `Deadline for Goal "${goal.title}" Has Passed`;
      const text = `The goal "${goal.title}" with description "${goal.description}" has passed its deadline on ${new Date(
        goal.deadline
      ).toLocaleDateString()}. Please take action.`;

      // Collect recipients: Always send to priyanshuyadav0404@gmail.com
      const recipients = ["priyanshuyadav0404@gmail.com"];

      // If the goal department matches one of the departments, send to the corresponding department admin
      if (goal.department) {
        recipients.push(departmentAdmins[goal.department]?.email ?? "sahilyadavind0908@gmail.com");
      }

      // Send email to each recipient
      recipients.forEach(recipient => {
        const recipientName =
          recipient === "priyanshuyadav0404@gmail.com"
            ? "Priyanshu Yadav"
            : departmentAdmins[goal.department]?.name ?? "Department Admin";

        // Update the recipient's name dynamically in the template
        html = fillTemplate(html, {
          "Recipient Name": recipientName, // Dynamic name insertion
        });

        // Send the email with the filled template
        sendEmail(recipient, subject, text, html);
      });
    });
  } catch (error) {
    console.error("Error checking expired goals:", error);
  }
});
