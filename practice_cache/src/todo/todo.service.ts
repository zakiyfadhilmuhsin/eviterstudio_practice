import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { Inject, Injectable } from "@nestjs/common";
import { Cache } from "cache-manager";

export interface Todo {
    id: number;
    title: string;
}

@Injectable()
export class TodoService {
    private todos: Todo[] = []; // Anggap database
    private idCounter: number = 1;

    // constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

    // async findAll(): Promise<Todo[]> {
    //     // cek apakah data ada di cache
    //     const cached = await this.cacheManager.get<Todo[]>('todos');
    //     if(cached) {
    //         console.log('📦 Ambil dari cache');
    //         return cached;
    //     }

    //     console.log('💾 Ambil dari memory service');
    //     // kalau belum ada di cache → ambil dari data asli & simpan ke cache
    //     await this.cacheManager.set('todos', this.todos, 10_000); // 10 detik
    //     return this.todos;
    // }

    // async create(title: string): Promise<Todo> {
    //     const todo: Todo = { id: this.idCounter++, title };
    //     this.todos.push(todo);

    //     // clear cache supaya GET nanti ambil data baru
    //     await this.cacheManager.del('todos');

    //     return todo;
    // }

    async findAll(): Promise<Todo[]> {
        console.log('💾 Ambil dari memory service');
        return this.todos;
    }

    async create(title: string): Promise<Todo> {
        const todo: Todo = { id: this.idCounter++, title };
        this.todos.push(todo);
        return todo;
    }
}