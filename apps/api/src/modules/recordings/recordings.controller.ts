import { Controller, Post, Get, Param, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { RecordingsService } from './recordings.service';
import { AuthGuard } from '@nestjs/passport';

@ApiTags('Recordings')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('recordings')
export class RecordingsController {
  constructor(private readonly recordingsService: RecordingsService) {}

  @ApiOperation({ summary: 'Initiate S3 presigned upload for call recording' })
  @Post('upload-initiate')
  async initiateUpload(@Request() req, @Body() body: { callId: string; fileSizeBytes: number; mimeType: string; checksumSha256: string; durationSeconds: number }) {
    return this.recordingsService.initiateUpload(req.user.organizationId, body.callId, body);
  }

  @ApiOperation({ summary: 'Complete S3 recording upload verification' })
  @Post(':id/upload-complete')
  async completeUpload(@Request() req, @Param('id') id: string) {
    return this.recordingsService.completeUpload(req.user.organizationId, id);
  }

  @ApiOperation({ summary: 'Get short-lived 5-minute presigned GET playback URL' })
  @Get(':id/stream')
  async getStreamUrl(@Request() req, @Param('id') id: string) {
    return this.recordingsService.getStreamUrl(
      req.user.organizationId,
      id,
      req.user.userId,
      `${req.user.firstName} ${req.user.lastName}`,
    );
  }
}
