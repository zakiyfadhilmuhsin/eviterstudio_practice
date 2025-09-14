export class TodoCreatedEvent {
    constructor(
        public readonly id: number,
        public readonly title: string
    ) {}
}