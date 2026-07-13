const nodemailer = require('nodemailer');

const sendResetEmail = async (email, token) => {
  let transporter;
  if (process.env.NODE_ENV === 'test') {
    transporter = nodemailer.createTransport({
      jsonTransport: true
    });
  } else {
    // Ethereal test account for dev mode
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass
      }
    });
  }

  const resetLink = `http://localhost:3000/reset-password?token=${token}`;

  const mailOptions = {
    from: '"SwiftRide Support" <support@swiftride.com>',
    to: email,
    subject: 'Captain Password Reset Request',
    text: `You requested a password reset. Click this link to reset your password: ${resetLink}. This link expires in 15 minutes.`,
    html: `<p>You requested a password reset.</p><p>Click this <a href="${resetLink}">link</a> to reset your password.</p><p>This link expires in 15 minutes.</p>`
  };

  const info = await transporter.sendMail(mailOptions);
  
  let previewUrl = '';
  if (process.env.NODE_ENV !== 'test') {
    previewUrl = nodemailer.getTestMessageUrl(info);
  }
  return {
    messageId: info.messageId,
    previewUrl
  };
};

module.exports = {
  sendResetEmail
};
