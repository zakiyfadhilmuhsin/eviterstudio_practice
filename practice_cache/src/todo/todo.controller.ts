import { Body, Controller, Get, Inject, Post, UseInterceptors } from "@nestjs/common";
import { TodoService } from "./todo.service";
import { CACHE_MANAGER, CacheInterceptor, CacheKey, CacheTTL } from "@nestjs/cache-manager";
import { Cache } from "cache-manager";

@Controller('todos')
export class TodoController {
    constructor(
        private readonly todoService: TodoService,
        @Inject(CACHE_MANAGER) private cacheManager: Cache
    ) { }

    // @Get()
    // async findAll() {
    //     return this.todoService.findAll();
    // }

    // @Post()
    // async create(@Body('title') title: string) {
    //     return this.todoService.create(title);
    // }

    @Get()
    @UseInterceptors(CacheInterceptor) // aktifkan cache di endpoint ini
    @CacheKey('todos') // key cache custom
    @CacheTTL(30000) // TTL khusus endpoint ini (15 detik)
    async findAll() {
        console.log('🔥 masuk controller');
        return this.todoService.findAll();
    }

    @Post()
    async create(@Body('title') title: string) {
        const todo = this.todoService.create(title);

        // invalidate cache biar GET nanti ambil data baru
        await this.cacheManager.del('todos');

        return todo;
    }

    @Get('check-cache')
    async checkCache(@Inject(CACHE_MANAGER) cache: Cache) {
        const data = await this.cacheManager.get('todos');
        console.log('🧩 isi cache:', data);
        return data ?? 'Cache kosong';
    }
}