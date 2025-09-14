import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { TodoModule } from './todos/todo.module';

@Module({
  imports: [
    EventEmitterModule.forRoot(),
    TodoModule
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
