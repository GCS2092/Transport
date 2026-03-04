import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  root() {
    return {
      name: 'VTC Dakar API',
      version: '1.0.0',
      status: 'running',
      baseUrl: '/api/v1',
      routes: {
        public: {
          description: 'Accessible sans authentification',
          endpoints: [
            'GET  /api/v1/health',
            'GET  /api/v1/zones/active',
            'GET  /api/v1/tariffs/active',
            'GET  /api/v1/tariffs/price?from=<zoneId>&to=<zoneId>',
            'POST /api/v1/auth/login',
            'POST /api/v1/auth/refresh',
            'POST /api/v1/reservations',
            'GET  /api/v1/reservations/code/:code',
            'POST /api/v1/reservations/cancel',
          ],
        },
        client_driver: {
          description: 'Authentifié (token Bearer)',
          endpoints: [
            'POST /api/v1/auth/logout',
            'POST /api/v1/auth/logout-all',
            'GET  /api/v1/drivers/me',
            'PUT  /api/v1/drivers/me/status',
            'GET  /api/v1/reservations/driver/my',
          ],
        },
        admin: {
          description: 'Rôle ADMIN requis',
          endpoints: [
            'GET  /api/v1/zones',
            'POST /api/v1/zones',
            'PUT  /api/v1/zones/:id',
            'DELETE /api/v1/zones/:id',
            'GET  /api/v1/tariffs',
            'POST /api/v1/tariffs',
            'PUT  /api/v1/tariffs/:id',
            'DELETE /api/v1/tariffs/:id',
            'GET  /api/v1/drivers',
            'GET  /api/v1/drivers/available',
            'GET  /api/v1/drivers/:id',
            'POST /api/v1/drivers',
            'PUT  /api/v1/drivers/:id',
            'PUT  /api/v1/drivers/:id/status',
            'DELETE /api/v1/drivers/:id',
            'GET  /api/v1/reservations',
            'GET  /api/v1/reservations/:id',
            'PUT  /api/v1/reservations/:id/assign',
            'PUT  /api/v1/reservations/:id/status',
            'PUT  /api/v1/reservations/:id/cancel',
            'GET  /api/v1/admin/stats',
            'GET  /api/v1/admin/email-logs',
            'GET  /api/v1/admin/users',
            'POST /api/v1/admin/users/driver',
            'POST /api/v1/admin/users/:id/deactivate',
            'PUT  /api/v1/admin/users/:id/activate',
          ],
        },
      },
    };
  }
}
