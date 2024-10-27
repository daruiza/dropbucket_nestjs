import { IsNotEmpty, IsOptional, IsString, MinLength } from "class-validator";

export class CreateRolDto {
    @IsString()
    @IsNotEmpty()
    @MinLength(3)
    name: string;

    @IsOptional()
    @IsString()
    description?: string;
}
