import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

import { Organization, OrganizationSchema } from './schemas/organization.schema';
import { User, UserSchema } from './schemas/user.schema';
import { Call, CallSchema } from './schemas/call.schema';
import { Recording, RecordingSchema } from './schemas/recording.schema';
import { Device, DeviceSchema } from './schemas/device.schema';
import { AuditLog, AuditLogSchema } from './schemas/audit-log.schema';

import { AuthService } from './modules/auth/auth.service';
import { AuthController } from './modules/auth/auth.controller';
import { JwtStrategy } from './modules/auth/jwt.strategy';

import { CallsService } from './modules/calls/calls.service';
import { CallsController } from './modules/calls/calls.controller';

import { RecordingsService } from './modules/recordings/recordings.service';
import { RecordingsController } from './modules/recordings/recordings.controller';

import { AnalyticsService } from './modules/analytics/analytics.service';
import { AnalyticsController } from './modules/analytics/analytics.controller';

import { DevicesService } from './modules/devices/devices.service';
import { DevicesController } from './modules/devices/devices.controller';

import { AppController } from './app.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRoot(process.env.MONGODB_URI || 'mongodb://localhost:27017/recordhub?replicaSet=rs0&directConnection=true'),
    MongooseModule.forFeature([
      { name: Organization.name, schema: OrganizationSchema },
      { name: User.name, schema: UserSchema },
      { name: Call.name, schema: CallSchema },
      { name: Recording.name, schema: RecordingSchema },
      { name: Device.name, schema: DeviceSchema },
      { name: AuditLog.name, schema: AuditLogSchema },
    ]),
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'super_secret_recordhub_jwt_key_2026_change_in_production',
      signOptions: { expiresIn: '1d' },
    }),
  ],
  controllers: [
    AppController,
    AuthController,
    CallsController,
    RecordingsController,
    AnalyticsController,
    DevicesController,
  ],
  providers: [
    AuthService,
    JwtStrategy,
    CallsService,
    RecordingsService,
    AnalyticsService,
    DevicesService,
  ],
})
export class AppModule {}
