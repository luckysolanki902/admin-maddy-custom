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
  })
};
