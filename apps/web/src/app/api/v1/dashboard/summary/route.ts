import { NextResponse } from 'next/server';
import { connectToDatabase, withDbRetry } from '@/lib/db';
import { CallModel, UserModel, TeamModel } from '@/lib/models';
import { cacheGet, cacheSet } from '@/lib/cache';
import { DASHBOARD_SUMMARY_CACHE_KEY, DASHBOARD_SUMMARY_CACHE_TTL } from '@/lib/cache-service';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const dateRange = searchParams.get('dateRange') || searchParams.get('range') || 'All time';
    const startDateParam = searchParams.get('startDate') || searchParams.get('from');
    const endDateParam = searchParams.get('endDate') || searchParams.get('to');
    const counselorEmail = searchParams.get('counselorEmail') || searchParams.get('email');
    const team = searchParams.get('team');
    const channel = searchParams.get('channel');

    const cacheKey = `summary:${dateRange}:${startDateParam || ''}:${endDateParam || ''}:${counselorEmail || ''}:${team || ''}:${channel || ''}`;
    const cached = await cacheGet<any>(cacheKey);
    if (cached) {
      const res = NextResponse.json(cached);
      res.headers.set('Access-Control-Allow-Origin', '*');
      res.headers.set('X-Cache', 'HIT');
      return res;
    }

    const match: any = {};

    // 1. Date Range Matching
    if (dateRange !== 'All time') {
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);

      if (dateRange === 'Today') {
        const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
        match.startTime = { $gte: startOfToday, $lte: endOfToday };
      } else if (dateRange === 'Last 24 hours') {
        const last24h = new Date(now.getTime() - 24 * 3600 * 1000);
        match.startTime = { $gte: last24h, $lte: now };
      } else if (dateRange === 'Yesterday') {
        const startOfYesterday = new Date(startOfToday.getTime() - 86400000);
        const endOfYesterday = new Date(startOfToday.getTime() - 1);
        match.startTime = { $gte: startOfYesterday, $lte: endOfYesterday };
      } else if (dateRange === 'This week') {
        const sevenDaysAgo = new Date(startOfToday.getTime() - 7 * 86400000);
        match.startTime = { $gte: sevenDaysAgo };
      } else if (dateRange === 'This month') {
        const thirtyDaysAgo = new Date(startOfToday.getTime() - 30 * 86400000);
        match.startTime = { $gte: thirtyDaysAgo };
      } else if (dateRange === 'Custom') {
        if (startDateParam || endDateParam) {
          match.startTime = {};
          if (startDateParam) {
            const [sYear, sMonth, sDay] = startDateParam.split('-').map(Number);
            match.startTime.$gte = new Date(sYear, sMonth - 1, sDay, 0, 0, 0, 0);
          }
          if (endDateParam) {
            const [eYear, eMonth, eDay] = endDateParam.split('-').map(Number);
            match.startTime.$lte = new Date(eYear, eMonth - 1, eDay, 23, 59, 59, 999);
          }
        }
      }
    }

    if (counselorEmail) {
      match.counselorEmail = counselorEmail.toLowerCase().trim();
    }
    if (team && team !== 'All Teams') {
      match.team = team.trim();
    }
    if (channel) {
      match.channel = channel.toUpperCase().trim();
    }

    const summaryResult = await withDbRetry(async () => {
      const [stats] = await (CallModel as any).aggregate([
        { $match: match },
        {
          $facet: {
            kpis: [
              {
                $group: {
                  _id: null,
                  totalCalls: { $sum: 1 },
                  outboundCalls: { $sum: { $cond: [{ $in: [{ $toUpper: '$direction' }, ['OUTGOING', 'OUTBOUND']] }, 1, 0] } },
                  inboundCalls: { $sum: { $cond: [{ $in: [{ $toUpper: '$direction' }, ['INCOMING', 'INBOUND']] }, 1, 0] } },
                  answeredCalls: { $sum: { $cond: [{ $eq: [{ $toUpper: '$status' }, 'ANSWERED'] }, 1, 0] } },
                  unansweredCalls: { $sum: { $cond: [{ $ne: [{ $toUpper: '$status' }, 'ANSWERED'] }, 1, 0] } },
                  totalDuration: { $sum: { $cond: [{ $eq: [{ $toUpper: '$status' }, 'ANSWERED'] }, { $ifNull: ['$durationSeconds', 0] }, 0] } },
                  outboundDuration: {
                    $sum: {
                      $cond: [
                        {
                          $and: [
                            { $in: [{ $toUpper: '$direction' }, ['OUTGOING', 'OUTBOUND']] },
                            { $eq: [{ $toUpper: '$status' }, 'ANSWERED'] },
                          ],
                        },
                        { $ifNull: ['$durationSeconds', 0] },
                        0,
                      ],
                    },
                  },
                  inboundDuration: {
                    $sum: {
                      $cond: [
                        {
                          $and: [
                            { $in: [{ $toUpper: '$direction' }, ['INCOMING', 'INBOUND']] },
                            { $eq: [{ $toUpper: '$status' }, 'ANSWERED'] },
                          ],
                        },
                        { $ifNull: ['$durationSeconds', 0] },
                        0,
                      ],
                    },
                  },
                },
              },
            ],
            byCounselor: [
              {
                $group: {
                  _id: { $ifNull: ['$counselorEmail', '$agentName'] },
                  agentName: { $first: '$agentName' },
                  counselorEmail: { $first: '$counselorEmail' },
                  team: { $first: '$team' },
                  totalCalls: { $sum: 1 },
                  answeredCalls: { $sum: { $cond: [{ $eq: [{ $toUpper: '$status' }, 'ANSWERED'] }, 1, 0] } },
                  unansweredCalls: { $sum: { $cond: [{ $ne: [{ $toUpper: '$status' }, 'ANSWERED'] }, 1, 0] } },
                  whatsappCalls: {
                    $sum: {
                      $cond: [
                        {
                          $or: [
                            { $eq: [{ $toUpper: '$channel' }, 'WHATSAPP'] },
                            { $regexMatch: { input: { $ifNull: ['$disposition', ''] }, regex: /whatsapp/i } },
                          ],
                        },
                        1,
                        0,
                      ],
                    },
                  },
                  durationSeconds: { $sum: { $cond: [{ $eq: [{ $toUpper: '$status' }, 'ANSWERED'] }, { $ifNull: ['$durationSeconds', 0] }, 0] } },
                },
              },
              { $sort: { totalCalls: -1 } },
            ],
            byHour: [
              {
                $project: {
                  hour: { $hour: { date: '$startTime', timezone: '+05:30' } },
                },
              },
              {
                $group: {
                  _id: '$hour',
                  count: { $sum: 1 },
                },
              },
              { $sort: { _id: 1 } },
            ],
          },
        },
      ]);

      const kpi = stats?.kpis?.[0] || {
        totalCalls: 0,
        outboundCalls: 0,
        inboundCalls: 0,
        answeredCalls: 0,
        unansweredCalls: 0,
        totalDuration: 0,
        outboundDuration: 0,
        inboundDuration: 0,
      };

      const hours = Array.from({ length: 24 }, (_, i) => {
        const found = (stats?.byHour || []).find((h: any) => h._id === i);
        return {
          hourIndex: i,
          count: found ? found.count : 0,
        };
      });

      return {
        ...kpi,
        hourlyDistribution: hours,
        byCounselor: stats?.byCounselor || [],
      };
    });

    await cacheSet(cacheKey, summaryResult, DASHBOARD_SUMMARY_CACHE_TTL);

    const res = NextResponse.json(summaryResult);
    res.headers.set('Access-Control-Allow-Origin', '*');
    res.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.headers.set('X-Cache', 'MISS');
    return res;
  } catch (err: any) {
    console.error('Error in GET /api/v1/dashboard/summary:', err);
    return NextResponse.json({ message: err.message || 'Error generating summary' }, { status: 500 });
  }
}
