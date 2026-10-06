const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');

// 1. Auto-discover and load .env file
function loadEnv() {
  const candidatePaths = [
    path.resolve(process.cwd(), '.env'),
    path.resolve(process.cwd(), '.env.local'),
    path.resolve(process.cwd(), 'apps/web/.env'),
    path.resolve(process.cwd(), 'apps/web/.env.local'),
  ];

  for (const envPath of candidatePaths) {
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      content.split('\n').forEach((line) => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
          const idx = trimmed.indexOf('=');
          const key = trimmed.substring(0, idx).trim();
          const val = trimmed.substring(idx + 1).trim().replace(/^['"]|['"]$/g, '');
          if (!process.env[key]) {
            process.env[key] = val;
          }
        }
      });
    }
  }
}

loadEnv();

async function testZohoMailer() {
  console.log('----------------------------------------------------');
  console.log('🧪 Testing Zoho Mail SMTP Connection...');
  console.log('----------------------------------------------------');

  const host = process.env.ZOHO_SMTP_HOST || 'smtppro.zoho.in';
  const port = Number(process.env.ZOHO_SMTP_PORT || 465);
  const user = process.env.ZOHO_EMAIL;
  const pass = process.env.ZOHO_PASSWORD;
  const hrEmail = process.env.HR_EMAIL || process.env.HR_REPORT_EMAIL;

  console.log(`Host: ${host}`);
  console.log(`Port: ${port}`);
  console.log(`User: ${user ? user : '❌ NOT SET'}`);
  console.log(`Password: ${pass ? '******** (configured)' : '❌ NOT SET'}`);
  console.log(`Recipient HR Email: ${hrEmail ? hrEmail : '❌ NOT SET'}`);

  if (!user || !pass) {
    console.error('\n❌ ERROR: ZOHO_EMAIL or ZOHO_PASSWORD missing in your .env file!');
    process.exit(1);
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
    tls: { rejectUnauthorized: false },
  });

  try {
    console.log('\n⏳ Verifying credentials with Zoho SMTP server...');
    await transporter.verify();
    console.log('✅ Zoho SMTP Authentication Successful!\n');

    if (!hrEmail) {
      console.log('⚠️ HR_EMAIL not set in .env. Skipping test email send.');
      return;
    }

    console.log(`⏳ Sending test verification email to: ${hrEmail}...`);
    const info = await transporter.sendMail({
      from: `"RecordHub Alert" <${user}>`,
      to: hrEmail,
      subject: '✅ RecordHub Zoho Mail Automation Test',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; background: #f8fafc; border-radius: 8px;">
          <h2 style="color: #312e81;">Zoho Mail Setup Verified Successfully!</h2>
          <p>This is a test notification confirming that the automated reporting service is active and connected via Zoho Mail.</p>
          <div style="background: #ffffff; padding: 15px; border-left: 4px solid #16a34a; border-radius: 4px;">
            <strong>System:</strong> RecordHub Daily Reporting System<br/>
            <strong>Timestamp:</strong> ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} (IST)<br/>
            <strong>Sender:</strong> ${user}
          </div>
        </div>
      `,
    });

    console.log(`✅ Test email delivered successfully! Message ID: ${info.messageId}`);
    console.log('----------------------------------------------------');
  } catch (err) {
    console.error('\n❌ Zoho SMTP Error:', err.message);
    if (err.response) console.error('Server response:', err.response);
  }
}

testZohoMailer();
