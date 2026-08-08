import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { User, UserDocument } from '../../schemas/user.schema';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private jwtService: JwtService,
  ) {}

  async login(email: string, pass: string) {
    const user = await this.userModel.findOne({ email: email.toLowerCase() });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials. Counselor ID not provisioned by Admin!');
    }

    const isMatch = await bcrypt.compare(pass, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid credentials. Incorrect password!');
    }

    const payload = {
      sub: user._id.toString(),
      email: user.email,
      organizationId: user.organizationId ? user.organizationId.toString() : '65c1f0000000000000000001',
      role: user.role,
    };

    return {
      accessToken: this.jwtService.sign(payload),
      user: {
        id: user._id.toString(),
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        organizationId: user.organizationId ? user.organizationId.toString() : '65c1f0000000000000000001',
      },
    };
  }

  async registerCounselor(dto: { email: string; firstName: string; lastName?: string; role?: string; pass?: string }) {
    const existing = await this.userModel.findOne({ email: dto.email.toLowerCase() });
    if (existing) {
      return existing;
    }
    const rawPass = dto.pass || 'Password123!';
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(rawPass, salt);

    const newUser = new this.userModel({
      email: dto.email.toLowerCase(),
      firstName: dto.firstName,
      lastName: dto.lastName || '',
      role: dto.role || 'COUNSELOR',
      passwordHash,
      phoneNumber: '',
    });

    return await newUser.save();
  }

  async getAllCounselors() {
    return await this.userModel.find().select('-passwordHash').exec();
  }

  async updateCounselor(id: string, dto: { firstName?: string; lastName?: string; role?: string; email?: string }) {
    return await this.userModel.findByIdAndUpdate(id, { $set: dto }, { new: true }).select('-passwordHash').exec();
  }

  async deleteCounselor(id: string) {
    return await this.userModel.findByIdAndDelete(id).exec();
  }
}
