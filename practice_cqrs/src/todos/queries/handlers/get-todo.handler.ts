import { IQueryHandler, QueryHandler } from "@nestjs/cqrs";
import { GetTodoQuery } from "../get-todo.query";
import { TodoRepository } from "src/todos/todo.repository";

@QueryHandler(GetTodoQuery)
export class GetTodoHandler implements IQueryHandler<GetTodoQuery> {
    constructor(private repo: TodoRepository) {}

    async execute(query: GetTodoQuery): Promise<any> {
        return await this.repo.findOne(query.id);
    }
}