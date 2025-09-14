import { Module } from "@nestjs/common";
import { TodosController } from "./todos.controller";
import { TodoRepository } from "./todo.repository";
import { CreateTodoHandler } from "./commands/handlers/create-todo.handler";
import { UpdateTodoHandler } from "./commands/handlers/update-todo.handler";
import { GetTodoHandler } from "./queries/handlers/get-todo.handler";
import { GetTodosHandler } from "./queries/handlers/get-todos.handler";
import { DeleteTodoHandler } from "./commands/handlers/delete-todo.handler";

export const CommandHandlers = [CreateTodoHandler, UpdateTodoHandler, DeleteTodoHandler];
export const QueryHandlers = [GetTodoHandler, GetTodosHandler];

@Module({
    imports: [],
    controllers: [
        TodosController
    ],
    providers: [
        TodoRepository,
        ...CommandHandlers,
        ...QueryHandlers
    ]
})
export class TodosModule {}