import { IsEmail, IsNotEmpty, IsNumber, IsNumberString, IsOptional, IsString, Matches, MinLength } from "class-validator";


export class CreateUserDto {
    // @IsNumber()
    // id: number;
    @IsString()
    @IsNotEmpty()
    @MinLength(3)
    names: string;

    @IsOptional()
    @IsString()
    lastnames?: string;

    @IsString()
    @IsEmail()
    @IsNotEmpty()
    email: string;

    @IsString()
    @IsNotEmpty()
    @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,{
        message: 'El Password debe incluir 8 caracteres, una minuscula, una mayuscula, un número y un caracter especial'
    })
    password: string;

    @IsOptional()
    @IsNumberString()
    @Matches(/^(?!.*(\d)\1)\d{4}$/, {
        message: 'El PIN debe ser un número de 4 dígitos y no puede contener dígitos repetidos consecutivamente.',
      })
    pin?: string;

    @IsOptional()
    @IsString()
    phone?: string;

    @IsOptional()
    @IsString()
    theme?: string;

    @IsOptional()
    @IsString()
    photo?: string;

    @IsNumberString()
    rol_id: number;
}
