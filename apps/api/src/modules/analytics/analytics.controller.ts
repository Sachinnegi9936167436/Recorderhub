import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { AuthGuard } from '@nestjs/passport';

@ApiTags('Analytics')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @ApiOperation({ summary: 'Get executive KPI cards metrics' })
  @Get('kpis')
  async getKPIs(@Request() req) {
    return this.analyticsService.getExecutiveKPIs(req.user.organizationId);
  }

  @ApiOperation({ summary: 'Get call volume and talk time series chart data' })
  @Get('time-series')
  async getTimeSeries(@Request() req) {
    return this.analyticsService.getTimeSeries(req.user.organizationId);
  }

  @ApiOperation({ summary: 'Get agent performance leaderboard' })
  @Get('leaderboard')
  async getLeaderboard(@Request() req) {
    return this.analyticsService.getLeaderboard(req.user.organizationId);
  }
}
