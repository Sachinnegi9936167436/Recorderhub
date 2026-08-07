import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CallsService } from './calls.service';
import { AuthGuard } from '@nestjs/passport';

@ApiTags('Calls')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('calls')
export class CallsController {
  constructor(private readonly callsService: CallsService) {}

  @ApiOperation({ summary: 'Batch sync offline call events from mobile app' })
  @Post('batch-sync')
  async batchSync(@Request() req, @Body() body: { callEvents: any[] }) {
    return this.callsService.batchSync(
      req.user.userId,
      req.user.organizationId,
      `${req.user.firstName} ${req.user.lastName}`,
      body.callEvents || [],
    );
  }

  @ApiOperation({ summary: 'List and filter calls with server-side pagination' })
  @Get()
  async findAll(@Request() req, @Query() query: any) {
    return this.callsService.findAll(
      req.user.organizationId,
      query,
      req.user.role,
      req.user.userId,
    );
  }

  @ApiOperation({ summary: 'Get single call details with AI analysis & recording state' })
  @Get(':id')
  async findOne(@Request() req, @Param('id') id: string) {
    return this.callsService.findOne(
      req.user.organizationId,
      id,
      req.user.userId,
      `${req.user.firstName} ${req.user.lastName}`,
    );
  }

  @ApiOperation({ summary: 'Update call disposition and coaching note' })
  @Patch(':id/disposition')
  async updateDisposition(@Request() req, @Param('id') id: string, @Body() body: { disposition: string }) {
    return this.callsService.updateDisposition(req.user.organizationId, id, body.disposition);
  }
}
