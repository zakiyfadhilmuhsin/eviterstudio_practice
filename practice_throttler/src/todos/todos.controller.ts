import { Body, Controller, Delete, Get, Param, Post } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";

@Controller('todos')
export class TodosController {
    private todos = [
        { id: 1, task: 'Belajar NestJS' },
        { id: 2, task: 'Implementasi Rate Limiting' },
    ]

    @Get()
    getTodos() {
        return this.todos;
    }

    @Post()
    @Throttle({ default: { limit: 5, ttl: 60000 } }) // max 5 request POST per menit
    addTodo(@Body('task') task: string) {
        const newTodo = { id: this.todos.length + 1, task };
        this.todos.push(newTodo);
        return newTodo;
    }

    @Delete(':id')
    @Throttle({ default: { limit: 2, ttl: 60000 } }) // max 2 request DELETE per menit
    deleteTodo(@Param('id') id: string) {
        this.todos = this.todos.filter((t) => t.id !== Number(id));
        return { message: `Todo ${id} deleted` };
    }
}