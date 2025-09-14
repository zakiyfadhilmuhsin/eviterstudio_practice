import { Module } from "@nestjs/common";
import { TodoController } from "./todo.controller";
import { TodoService } from "./todo.service";
import { TodoListener } from "./todo.listener";

@Module({
    imports: [],
    exports: [TodoService],
    controllers: [TodoController],
    providers: [TodoService, TodoListener]
})
export class TodoModule {}