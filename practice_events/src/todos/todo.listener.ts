import { Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { TodoCreatedEvent } from "./events/todo-created.event";

@Injectable()
export class TodoListener {
    private readonly logger = new Logger(TodoListener.name);

    @OnEvent('todo.created')
    handleTodoCreatedEvent(event: TodoCreatedEvent) {
        this.logger.log(`New todo created: [${event.id}] ${event.title}`);
        // Misalnya: kirim notifikasi email, push websocket, dll.
    }
}