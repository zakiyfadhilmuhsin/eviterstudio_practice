import { CommandHandler, ICommandHandler } from "@nestjs/cqrs";
import { CreateTodoCommand } from "../create-todo.command";
import { TodoRepository } from "src/todos/todo.repository";

@CommandHandler(CreateTodoCommand)
export class CreateTodoHandler implements ICommandHandler<CreateTodoCommand> {
    constructor(private repo: TodoRepository) {}

    async execute(command: CreateTodoCommand): Promise<any> {
        return await this.repo.create(command.title, command.description);
    }
}