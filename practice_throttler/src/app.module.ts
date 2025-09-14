import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { TodosController } from './todos/todos.controller';

@Module({
  imports: [
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 10,
    }]),
  ],
  controllers: [
    TodosController
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard, // aktifkan guard global
    },
  ],
})
export class AppModule {}
