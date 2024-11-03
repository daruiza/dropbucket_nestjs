import { IsNotEmpty, IsOptional, IsString} from "class-validator";

export class UploadedBodyDto {
    @IsString()
    @IsOptional()
    prefix: string
}
