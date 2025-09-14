import { CommandHandler, ICommandHandler } from "@nestjs/cqrs";
import { TodoRepository } from "src/todos/todo.repository";
import { DeleteTodoCommand } from "../delete-todo.command";

@CommandHandler(DeleteTodoCommand)
export class DeleteTodoHandler implements ICommandHandler<DeleteTodoCommand> {
    constructor(private repo: TodoRepository) {}

    async execute(command: DeleteTodoCommand): Promise<any> {
        return await this.repo.delete(command.id);
    }
}