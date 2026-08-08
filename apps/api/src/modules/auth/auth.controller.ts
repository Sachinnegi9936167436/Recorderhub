import { Controller, Post, Get, Put, Delete, Body, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AuthService } from './auth.service';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @ApiOperation({ summary: 'Sign in to RecordHub platform' })
  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(@Body() body: { email: string; pass: string }) {
    return this.authService.login(body.email, body.pass);
  }

  @ApiOperation({ summary: 'Register a new counselor account (Admin only)' })
  @Post('register')
  async register(
    @Body() body: { email: string; firstName: string; lastName: string; role?: string; pass: string },
  ) {
    return this.authService.registerCounselor(body);
  }

  @ApiOperation({ summary: 'Get all registered counselors' })
  @Get('counselors')
  async getCounselors() {
    return this.authService.getAllCounselors();
  }

  @ApiOperation({ summary: 'Update counselor details/role (Admin only)' })
  @Put('counselors/:id')
  async updateCounselor(
    @Param('id') id: string,
    @Body() body: { firstName?: string; lastName?: string; role?: string; email?: string },
  ) {
    return this.authService.updateCounselor(id, body);
  }

  @ApiOperation({ summary: 'Delete counselor account (Admin only)' })
  @Delete('counselors/:id')
  async deleteCounselor(@Param('id') id: string) {
    return this.authService.deleteCounselor(id);
  }
}
