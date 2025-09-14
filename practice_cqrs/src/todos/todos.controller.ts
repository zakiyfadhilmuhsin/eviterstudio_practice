import { Body, Controller, Delete, Get, Param, Post, Put } from "@nestjs/common";
import { CommandBus, QueryBus } from "@nestjs/cqrs";
import { CreateTodoCommand } from "./commands/create-todo.command";
import { GetTodosQuery } from "./queries/get-todos.query";
import { GetTodoQuery } from "./queries/get-todo.query";
import { UpdateTodoCommand } from "./commands/update-todo.command";
import { DeleteTodoCommand } from "./commands/delete-todo.command";

@Controller('todos')
export class TodosController {
    constructor(
        private commandBus: CommandBus,
        private queryBus: QueryBus
    ) {}

    @Post()
    create(@Body() body) {
        return this.commandBus.execute(new CreateTodoCommand(body.title, body.description));
    }

    @Get()
    findAll() {
        return this.queryBus.execute(new GetTodosQuery());
    }

    @Get(':id')
    findOne(@Param('id') id: number) {
        return this.queryBus.execute(new GetTodoQuery(+id));
    }

    @Put(':id')
    update(@Param('id') id: number, @Body() body: any) {
        return this.commandBus.execute(
            new UpdateTodoCommand(+id, body.title, body.description, body.done)
        );
    }

    @Delete(':id')
    delete(@Param('id') id: number) {
        return this.commandBus.execute(new DeleteTodoCommand(+id));
    }
}