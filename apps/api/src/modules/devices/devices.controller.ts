import { Controller, Post, Get, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { DevicesService } from './devices.service';
import { AuthGuard } from '@nestjs/passport';

@ApiTags('Devices')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('devices')
export class DevicesController {
  constructor(private readonly devicesService: DevicesService) {}

  @ApiOperation({ summary: 'Register mobile agent hardware and capability profile' })
  @Post('register')
  async register(@Request() req, @Body() body: any) {
    return this.devicesService.registerDevice(
      req.user.userId,
      req.user.organizationId,
      `${req.user.firstName} ${req.user.lastName}`,
      body,
    );
  }

  @ApiOperation({ summary: 'Post device health heartbeat snapshot' })
  @Post(':deviceId/heartbeat')
  async heartbeat(@Param('deviceId') deviceId: string, @Body() body: any) {
    return this.devicesService.heartbeat(deviceId, body);
  }

  @ApiOperation({ summary: 'Get team device health and sync status diagnostics' })
  @Get()
  async getHealthList(@Request() req) {
    return this.devicesService.getHealthList(req.user.organizationId);
  }
}
