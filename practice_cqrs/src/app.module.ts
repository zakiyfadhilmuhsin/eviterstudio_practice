import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TodosModule } from './todos/todos.module';

@Module({
  imports: [
    CqrsModule.forRoot(),
    TodosModule
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
