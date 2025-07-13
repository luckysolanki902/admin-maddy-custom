import nodemailer from 'nodemailer';

// Create reusable transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    port: 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.NODEMAILER_USER,
      pass: process.env.NODEMAILER_PASSWORD,
    },
    tls: {
      rejectUnauthorized: false
    }
  });
};

// Send email function
export const sendEmail = async ({ to, subject, html }) => {
  try {
    const transporter = createTransporter();
    
    // Email options
    const mailOptions = {
      from: `"MaddyCustom Feature Requests" <${process.env.NODEMAILER_USER}>`,
      to,
      subject,
      html,
    };
    
    // Send email
    const info = await transporter.sendMail(mailOptions);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending email:', error);
    return { success: false, error: error.message };
  }
};

// Email templates
export const emailTemplates = {
  // New feature request notification
  newFeatureRequest: (requestDetails) => ({
    subject: `New Feature Request: ${requestDetails.title}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
        <h2 style="color: #333;">New Feature Request Submitted</h2>
        <p><strong>Title:</strong> ${requestDetails.title}</p>
        <p><strong>Requested By:</strong> ${requestDetails.requestedBy.name} (${requestDetails.requestedBy.department})</p>
        <p><strong>Target Department:</strong> ${requestDetails.targetDepartment}</p>
        <p><strong>Priority:</strong> ${requestDetails.priority}</p>
        <p><strong>Description:</strong></p>
        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 6px;">
          ${requestDetails.description}
        </div>
        <p style="margin-top: 20px;">
          <a href="${process.env.NEXT_PUBLIC_BASE_URL}/admin/feature-requests/${requestDetails._id}" style="display: inline-block; padding: 10px 15px; background-color: #007bff; color: #ffffff; text-decoration: none; border-radius: 5px;">View Request</a>
        </p>
        <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd;">
          <p style="margin-top: 20px; font-size: 12px; color: #666;">This is an automated notification from MaddyCustom Feature Request System.</p>
        </div>
      </div>
    `
  }),

  // Status update notification
  statusUpdate: (requestDetails) => ({
    subject: `Feature Request Update: ${requestDetails.title} is now ${requestDetails.status}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
        <h2 style="color: #333;">Feature Request Status Update</h2>
        <p>Hello ${requestDetails.requestedBy.name},</p>
        <p>The status of your feature request titled "<strong>${requestDetails.title}</strong>" has been updated to <span style="color: ${
          requestDetails.status === 'Approved' ? '#4CAF50' : // Green
          requestDetails.status === 'Rejected' ? '#f44336' : // Red
          requestDetails.status === 'In Progress' ? '#ff9800' : // Orange
          requestDetails.status === 'In Review' ? '#2196f3' : // Blue
          requestDetails.status === 'Completed' ? '#673ab7' : // Deep Purple for Completed
          '#333' // Default
        }; font-weight: bold;">${requestDetails.status}</span>.</p>
        ${requestDetails.reviewedBy && requestDetails.reviewedBy.name ? `
        <p><strong>Updated By:</strong> ${requestDetails.reviewedBy.name} (${requestDetails.reviewedBy.department || 'Admin'})</p>
        ` : ''}
        ${requestDetails.reviewNotes ? `
        <p><strong>Review Notes:</strong></p>
        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 6px;">
          ${requestDetails.reviewNotes}
        </div>
        ` : ''}
        <p style="margin-top: 20px;">
          <a href="${process.env.NEXT_PUBLIC_BASE_URL}/admin/feature-requests/${requestDetails._id}" style="display: inline-block; padding: 10px 15px; background-color: #007bff; color: #ffffff; text-decoration: none; border-radius: 5px;">View Request Details</a>
        </p>
        <p style="margin-top: 20px; font-size: 12px; color: #666;">This is an automated notification from MaddyCustom Feature Request System.</p>
      </div>
    `
  }),

  // New comment notification
  newCommentNotification: (requestDetails) => ({
    subject: `New Comment on Your Feature Request: "${requestDetails.title}"`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
        <h2 style="color: #333;">New Comment Added</h2>
        <p>Hello ${requestDetails.requestedBy.name},</p>
        <p>A new comment has been added to your feature request titled "<strong>${requestDetails.title}</strong>".</p>
        <p style="margin-top: 20px;">
          <a href="${process.env.NEXT_PUBLIC_BASE_URL}/admin/feature-requests/${requestDetails._id}" style="display: inline-block; padding: 10px 15px; background-color: #007bff; color: #ffffff; text-decoration: none; border-radius: 5px;">View Request and Comment</a>
        </p>
        <p style="margin-top: 20px; font-size: 12px; color: #666;">This is an automated notification from MaddyCustom Feature Request System.</p>
      </div>
    `
  }),

  // Daily goals reminder
  dailyGoalsReminder: (goals, department) => ({
    subject: `Daily Goals Update - ${department}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
        <h2 style="color: #333;">Daily Goals Update - ${department}</h2>
        <p>Here are your pending goals for the ${department} department:</p>
        <div style="margin: 20px 0;">
          ${goals.map(goal => `
            <div style="background-color: #f9f9f9; padding: 15px; margin: 10px 0; border-radius: 6px; border-left: 4px solid #007bff;">
              <h4 style="margin: 0 0 10px 0; color: #333;">${goal.title}</h4>
              ${goal.description ? `<p style="margin: 5px 0; color: #666;">${goal.description}</p>` : ''}
              <p style="margin: 5px 0; font-size: 14px;"><strong>Deadline:</strong> ${new Date(goal.deadline).toLocaleDateString()}</p>
              <p style="margin: 5px 0; font-size: 14px;"><strong>Status:</strong> ${goal.isCompleted ? 'Completed' : 'Pending'}</p>
            </div>
          `).join('')}
        </div>
        <p style="margin-top: 20px; font-size: 12px; color: #666;">This is an automated daily reminder from MaddyCustom Goals System.</p>
      </div>
    `
  }),

  // Deadline warning
  deadlineWarning: (goals, department) => ({
    subject: `⚠️ Goal Deadline Alert - ${department}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
        <h2 style="color: #ff6b35;">⚠️ Goal Deadline Alert - ${department}</h2>
        <p>The following goals have deadlines today:</p>
        <div style="margin: 20px 0;">
          ${goals.map(goal => `
            <div style="background-color: #fff3cd; padding: 15px; margin: 10px 0; border-radius: 6px; border-left: 4px solid #ff6b35;">
              <h4 style="margin: 0 0 10px 0; color: #333;">${goal.title}</h4>
              ${goal.description ? `<p style="margin: 5px 0; color: #666;">${goal.description}</p>` : ''}
              <p style="margin: 5px 0; font-size: 14px; color: #ff6b35;"><strong>Deadline: TODAY</strong></p>
            </div>
          `).join('')}
        </div>
        <p style="margin-top: 20px; font-size: 12px; color: #666;">This is an automated deadline alert from MaddyCustom Goals System.</p>
      </div>
    `
  }),

  // Overdue goals
  overdueGoals: (goals, department) => ({
    subject: `🚨 Overdue Goals Alert - ${department}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
        <h2 style="color: #dc3545;">🚨 Overdue Goals Alert - ${department}</h2>
        <p>The following goals have exceeded their deadlines:</p>
        <div style="margin: 20px 0;">
          ${goals.map(goal => {
            const daysOverdue = Math.floor((new Date() - new Date(goal.deadline)) / (1000 * 60 * 60 * 24));
            return `
              <div style="background-color: #f8d7da; padding: 15px; margin: 10px 0; border-radius: 6px; border-left: 4px solid #dc3545;">
                <h4 style="margin: 0 0 10px 0; color: #333;">${goal.title}</h4>
                ${goal.description ? `<p style="margin: 5px 0; color: #666;">${goal.description}</p>` : ''}
                <p style="margin: 5px 0; font-size: 14px; color: #dc3545;"><strong>Overdue by ${daysOverdue} day(s)</strong></p>
                <p style="margin: 5px 0; font-size: 14px;"><strong>Original Deadline:</strong> ${new Date(goal.deadline).toLocaleDateString()}</p>
              </div>
            `;
          }).join('')}
        </div>
        <p style="margin-top: 20px; font-size: 12px; color: #666;">This is an automated overdue alert from MaddyCustom Goals System.</p>
      </div>
    `
  })
};
