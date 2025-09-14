import { Injectable } from "@nestjs/common";

export interface User {
    id: number;
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
    picture?: string;
}

@Injectable()
export class UsersService {
    private readonly users: User[] = [
        {
            id: 1,
            email: 'test@gmail.com',
            password: '$2a$10$examplehashedpassword',
            firstName: 'Test',
            lastName: 'Account'
        }
    ]

    constructor() {}

    async findByEmail(email: string): Promise<User | undefined> {
        return this.users.find(user => user.email === email);
    }

    async findById(id: number): Promise<User | undefined> {
        return this.users.find(user => user.id === id);
    }
}