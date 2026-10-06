import { NextResponse } from 'next/server';
import { generateDailyReportData, buildReportExcelBuffer, buildDailyReportHtml } from '@/lib/daily-report';
import { sendMail, verifyZohoConnection, ensureEnvLoaded } from '@/lib/mailer';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const maxDuration = 60; // Allow up to 60 seconds on serverless

/**
 * Validates CRON authorization token from Authorization header or URL query parameter
 */
function isAuthorized(req: Request, searchParams: URLSearchParams): boolean {
  ensureEnvLoaded();
  const configuredSecret = process.env.CRON_SECRET;
  
  // If no secret configured in dev mode, allow for initial testing, but warn
  if (!configuredSecret) {
    console.warn('[daily-report cron] CRON_SECRET is not set in environment variables');
    return true;
  }

  const authHeader = req.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.replace('Bearer ', '').trim();
    if (token === configuredSecret.trim()) return true;
  }

  const queryToken = searchParams.get('token') || searchParams.get('secret') || searchParams.get('key');
  if (queryToken && queryToken.trim() === configuredSecret.trim()) {
    return true;
  }

  return false;
}

export async function GET(req: Request) {
  return handleDailyReport(req);
}

export async function POST(req: Request) {
  return handleDailyReport(req);
}

async function handleDailyReport(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    // 1. Check Security Authorization
    if (!isAuthorized(req, searchParams)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized. Provide valid Bearer token in Authorization header or ?token=YOUR_CRON_SECRET in URL.',
        },
        { status: 401 }
      );
    }

    // 2. Test mode check (verifies SMTP without sending full report)
    const isTestMode = searchParams.get('test') === 'true';
    if (isTestMode) {
      const isConnected = await verifyZohoConnection();
      return NextResponse.json({
        success: true,
        message: 'Zoho SMTP credentials verified successfully!',
        smtpConfig: {
          host: process.env.ZOHO_SMTP_HOST || 'smtppro.zoho.in',
          port: process.env.ZOHO_SMTP_PORT || 465,
          user: process.env.ZOHO_EMAIL,
        },
      });
    }

    // 3. Determine Recipients and Date
    const queryTo = searchParams.get('to');
    const hrEmail = queryTo || process.env.HR_EMAIL || process.env.HR_REPORT_EMAIL;

    if (!hrEmail) {
      return NextResponse.json(
        {
          success: false,
          error: 'Recipient email not found. Please set HR_EMAIL in .env or pass ?to=email@example.com in the URL.',
        },
        { status: 400 }
      );
    }

    // Optional date override (e.g. ?date=2026-10-05)
    const targetDateParam = searchParams.get('date');
    const targetDate = targetDateParam ? new Date(targetDateParam) : undefined;

    // 4. Generate Aggregated Report Data & Excel
    const { data, rawCalls } = await generateDailyReportData(targetDate);
    const excelBuffer = buildReportExcelBuffer(data, rawCalls);
    const htmlEmail = buildDailyReportHtml(data);

    // 5. Send Email via Zoho Mail
    const recipients = hrEmail.split(',').map((e) => e.trim()).filter(Boolean);
    const subject = `📊 RecordHub Daily Operations Report — ${data.reportDateFormatted}`;

    const attachmentFilename = `RecordHub_Daily_Report_${data.dateKey}.xlsx`;

    const mailResult = await sendMail({
      to: recipients,
      subject,
      html: htmlEmail,
      attachments: [
        {
          filename: attachmentFilename,
          content: excelBuffer,
          contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        },
      ],
    });

    return NextResponse.json({
      success: true,
      message: `Daily report successfully sent to ${recipients.join(', ')}`,
      reportDate: data.reportDateFormatted,
      dateKey: data.dateKey,
      recipients,
      summary: {
        totalCalls: data.totalCalls,
        answeredCalls: data.answeredCalls,
        unansweredCalls: data.unansweredCalls,
        connectRate: data.connectRate,
        totalTalkDuration: data.formattedTotalDuration,
        activeCounselors: data.activeCounselorCount,
      },
      messageId: mailResult.messageId,
    });
  } catch (error: any) {
    console.error('[Daily Report Cron Error]:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'An error occurred while generating and sending the daily report',
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
