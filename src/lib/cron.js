const cron = require("node-cron");
const { connectToDatabase } = require("@/lib/db");
const AdminGoal = require("@/models/admin/AdminGoal");
const AdminProductivity = require("@/models/admin/AdminProductivity");
const { sendEmail, fillTemplate } = require("@/components/utils/emailUtils");
const fs = require("fs");
const path = require("path");
const { departmentAdmins } = require("@/lib/constants/user");

const templatesPath = [__dirname, "..", "..", "..", "..", "src", "templates"];

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
        "Action URL": `${process.env.NEXT_PUBLIC_CLIENT_URL}/admin/departments/${goal.department}-goals`,
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

// Cron job that runs every day at 9 PM
cron.schedule("0 21 * * *", async () => {
  try {
    await connectToDatabase();

    // Build today's date range
    const todayStr = new Date().toISOString().split("T")[0];
    const start = new Date(todayStr);
    const end = new Date(todayStr);
    end.setDate(end.getDate() + 1);

    // Fetch today's submissions
    const todaysEntries = await AdminProductivity.find({
      createdAt: { $gte: start, $lt: end },
    })
      .select("department")
      .lean();

    // Build list of departments that already submitted
    const submittedDepartments = new Set(todaysEntries.map(entry => entry.department));

    // Read HTML email template
    const templatePath = path.resolve(...templatesPath, "daily-productivity-request.html");
    let htmlTemplate = fs.readFileSync(templatePath, "utf8");

    const subject = "Daily Productivity Update Request";
    const text =
      "This is a gentle reminder to please submit your department's daily productivity update today. You can use the provided link.";

    // Send email to department admins only if they have NOT submitted
    Object.entries(departmentAdmins).forEach(([dept, admin]) => {
      if (!submittedDepartments.has(dept)) {
        const variables = {
          "Recipient Name": admin.name,
          "Action URL": `${process.env.NEXT_PUBLIC_CLIENT_URL}/admin/productivity/form`,
        };

        const personalizedHtml = fillTemplate(htmlTemplate, variables);

        sendEmail(admin.email, subject, text, personalizedHtml);
      }
    });

    // const variables = {
    //   "Recipient Name": "Sahil Yadav",
    //   "Action URL": `${process.env.NEXT_PUBLIC_CLIENT_URL}/admin/productivity/form`,
    // };

    // const sahilHtml = fillTemplate(htmlTemplate, variables);
    // sendEmail("sahilyadavind0908@gmail.com", subject, text, sahilHtml);
  } catch (error) {
    console.error("Error sending productivity request emails:", error);
  }
});
