import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

/**
 * Guard qui vérifie le token de supervision pour accéder aux sections sensibles
 * Ce token est obtenu via POST /auth/verify-password et est valable 30 minutes
 */
@Injectable()
export class SupervisionGuard implements CanActivate {
  constructor(private jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const supervisionToken = request.headers['x-supervision-token'];

    if (!supervisionToken) {
      throw new UnauthorizedException('Token de supervision requis');
    }

    try {
      const payload = await this.jwtService.verifyAsync(supervisionToken, {
        secret: process.env.JWT_ACCESS_SECRET,
      });

      // Vérifier que c'est bien un token de supervision
      if (payload.type !== 'supervision') {
        throw new UnauthorizedException('Token invalide');
      }

      // Attacher les infos de supervision à la requête
      request.supervision = payload;
      return true;
    } catch {
      throw new UnauthorizedException('Token de supervision invalide ou expiré');
    }
  }
}
