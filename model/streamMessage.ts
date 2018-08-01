import { Message, User } from './index';

export class StreamMessage extends Message{
    constructor(from: User, content: string) {
        super(from, content);
    }
}