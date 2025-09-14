import { Todo } from "./todo.entity";

export class TodoRepository {
    private todos: Todo[] = [];
    private idCounter = 1;

    create(title: string, description: string): Todo {
        const todo = new Todo(this.idCounter++, title, description);
        this.todos.push(todo);
        return todo;
    }

    findAll(): Todo[] {
        return this.todos;
    }

    findOne(id: number): Todo | undefined {
        return this.todos.find(t => t.id === id);
    }

    update(id: number, title: string, description: string, done: boolean): Todo | undefined {
        const todo = this.findOne(id);
        if(todo) {
            todo.title = title;
            todo.description = description;
            todo.done = done;
        }
        return todo;
    }

    delete(id: number): boolean {
        const index = this.todos.findIndex(t => t.id === id);
        if(index === -1) return false;
        this.todos.splice(index, 1);
        return true;
    }
}