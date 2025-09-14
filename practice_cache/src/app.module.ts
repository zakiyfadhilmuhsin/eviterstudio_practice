import { CacheInterceptor, CacheModule } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';
import { TodoModule } from './todo/todo.module';
import { APP_INTERCEPTOR } from '@nestjs/core';

@Module({
  imports: [
    CacheModule.register({
      ttl: 10, // default 10 detik
      max: 100, // maksimal 100 item cache
      store: 'memory',
      isGlobal: true, // cache bisa dipakai di semua module
    }),
    TodoModule
  ],
  controllers: [],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: CacheInterceptor, // pasang global interceptor
    }
  ],
})
export class AppModule {}
