import { IQueryHandler, QueryHandler } from "@nestjs/cqrs";
import { TodoRepository } from "src/todos/todo.repository";
import { GetTodosQuery } from "../get-todos.query";

@QueryHandler(GetTodosQuery)
export class GetTodosHandler implements IQueryHandler<GetTodosQuery> {
    constructor(private repo: TodoRepository) {}

    async execute(query: GetTodosQuery): Promise<any> {
        return await this.repo.findAll();
    }
}