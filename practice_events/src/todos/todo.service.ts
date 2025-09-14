import { Injectable } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { TodoCreatedEvent } from "./events/todo-created.event";

@Injectable()
export class TodoService {
    private todos: { id: number, title: string }[] = [];

    constructor(
        private eventEmitter: EventEmitter2
    ) {}

    create(title: string) {
        const newTodo = { id: Date.now(), title };
        this.todos.push(newTodo);

        // Emit event setelah todo dibuat
        this.eventEmitter.emit(
            'todo.created',
            new TodoCreatedEvent(newTodo.id, newTodo.title)
        );

        return newTodo;
    }

    findAll() {
        return this.todos;
    }
}