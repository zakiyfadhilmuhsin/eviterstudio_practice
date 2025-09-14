import { Body, Controller, Get, Post } from "@nestjs/common";
import { TodoService } from "./todo.service";

@Controller('todo')
export class TodoController {
    constructor(
        private readonly todoService: TodoService
    ) {}

    @Post()
    create(@Body('title') title: string) {
        return this.todoService.create(title);
    }

    @Get()
    findAll() {
        return this.todoService.findAll();
    }
}