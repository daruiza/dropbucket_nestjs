export class User {
    id: number;
    name: string;
    names?: string;
    lastnames?: string;
    email: string;
    password: string;
    phone?: string;
    theme?: string;
    prefix?: string;
    photo?: string;
    rolId: number;
    createdAt?: Date;
    updatedAt?: Date;
}
