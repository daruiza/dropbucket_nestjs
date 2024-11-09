import { IsEmail, IsNotEmpty, IsOptional, IsString, ValidateIf } from "class-validator";

export class LoginAuthDto {

    @IsOptional()
    @IsString()
    @ValidateIf((o) => !o.email || o.name)
    @IsNotEmpty({ message: 'Se requiere al menos name o email' })
    name?: string;

    @IsOptional()
    @IsEmail()
    @ValidateIf((o) => !o.name || o.email)
    @IsNotEmpty({ message: 'Se requiere al menos name o email' })
    email?: string;
    
    @IsString()
    @IsNotEmpty()
    password: string;
}