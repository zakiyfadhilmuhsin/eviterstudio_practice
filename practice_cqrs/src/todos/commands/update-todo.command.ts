export class UpdateTodoCommand {
    constructor(
        public readonly id: number,
        public readonly title: string,
        public readonly description: string,
        public readonly done: boolean
    ) {}
}