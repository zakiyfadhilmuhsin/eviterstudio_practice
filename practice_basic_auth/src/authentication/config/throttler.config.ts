import { ThrottlerModuleOptions } from '@nestjs/throttler';
import { ConfigService } from '@nestjs/config';

export const createThrottlerConfig = (configService: ConfigService): ThrottlerModuleOptions => {
  return [
    {
      name: 'global',
      ttl: configService.get<number>('THROTTLE_TTL') || 60 * 1000, // 1 minute
      limit: configService.get<number>('THROTTLE_LIMIT') || 100, // 100 requests per minute
    },
    {
      name: 'auth',
      ttl: configService.get<number>('THROTTLE_AUTH_TTL') || 60 * 1000, // 1 minute
      limit: configService.get<number>('THROTTLE_AUTH_LIMIT') || 10, // 10 auth requests per minute
    },
    {
      name: 'strict',
      ttl: configService.get<number>('THROTTLE_STRICT_TTL') || 5 * 60 * 1000, // 5 minutes
      limit: configService.get<number>('THROTTLE_STRICT_LIMIT') || 3, // 3 requests per 5 minutes
    }
  ];
};