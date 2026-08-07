import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('Health & System')
@Controller()
export class AppController {
  @Get()
  @ApiOperation({ summary: 'API Root Health Check' })
  getHealth() {
    return {
      status: 'ok',
      service: 'RecordHub REST API',
      version: '1.0.0',
      docs: '/docs',
      timestamp: new Date().toISOString(),
    };
  }
}
