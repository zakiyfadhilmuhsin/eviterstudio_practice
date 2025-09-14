import { CommandHandler, ICommandHandler } from "@nestjs/cqrs";
import { TodoRepository } from "src/todos/todo.repository";
import { UpdateTodoCommand } from "../update-todo.command";

@CommandHandler(UpdateTodoCommand)
export class UpdateTodoHandler implements ICommandHandler<UpdateTodoCommand> {
    constructor(private repo: TodoRepository) {}

    async execute(command: UpdateTodoCommand): Promise<any> {
        return await this.repo.update(
            command.id,
            command.title,
            command.description,
            command.done
        );
    }
}