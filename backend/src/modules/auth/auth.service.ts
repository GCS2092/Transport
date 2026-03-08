import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as argon2 from 'argon2';
import { v4 as uuidv4 } from 'uuid';
import { UsersService } from '../users/users.service';
import { RefreshToken } from './entities/refresh-token.entity';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    @InjectRepository(RefreshToken)
    private refreshTokenRepository: Repository<RefreshToken>,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user || !user.isActive) throw new UnauthorizedException('Invalid credentials');

    const passwordValid = await argon2.verify(user.password, dto.password);
    if (!passwordValid) throw new UnauthorizedException('Invalid credentials');

    const tokens = await this.generateTokens(user.id, user.email, user.role);
    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: user.firstName || '',
        lastName: user.lastName || '',
      },
    };
  }

  async refreshTokens(userId: string, refreshToken: string) {
    const tokenRecord = await this.refreshTokenRepository.findOne({
      where: { token: refreshToken, userId, isRevoked: false },
    });

    if (!tokenRecord || tokenRecord.expiresAt < new Date()) {
      throw new ForbiddenException('Invalid or expired refresh token');
    }

    await this.refreshTokenRepository.update(tokenRecord.id, { isRevoked: true });

    const user = await this.usersService.findById(userId);
    if (!user || !user.isActive) throw new UnauthorizedException();

    return this.generateTokens(user.id, user.email, user.role);
  }

  async logout(userId: string, refreshToken: string): Promise<void> {
    await this.refreshTokenRepository.update(
      { token: refreshToken, userId },
      { isRevoked: true },
    );
  }

  async logoutAll(userId: string): Promise<void> {
    await this.refreshTokenRepository.update({ userId }, { isRevoked: true });
  }

  async verifyPasswordAndGenerateSupervisionToken(
    userId: string,
    email: string,
    password: string,
  ): Promise<{ supervisionToken: string; expiresAt: Date }> {
    const user = await this.usersService.findById(userId);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordValid = await argon2.verify(user.password, password);
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid password');
    }

    // Generate a short-lived supervision token (30 minutes)
    const supervisionToken = this.jwtService.sign(
      { sub: userId, email, role: user.role, type: 'supervision' },
      {
        secret: process.env.JWT_ACCESS_SECRET,
        expiresIn: '30m',
      },
    );

    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 30);

    return { supervisionToken, expiresAt };
  }

  private async generateTokens(userId: string, email: string, role: string) {
    const payload = { sub: userId, email, role };

    const accessToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_ACCESS_SECRET,
      expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    });

    const refreshTokenValue = uuidv4();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const refreshTokenRecord = this.refreshTokenRepository.create({
      token: refreshTokenValue,
      userId,
      expiresAt,
    });
    await this.refreshTokenRepository.save(refreshTokenRecord);

    return { accessToken, refreshToken: refreshTokenValue };
  }
}
