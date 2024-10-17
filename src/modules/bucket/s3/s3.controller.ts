import { Controller, Get } from '@nestjs/common';

@Controller('bucket/s3')
export class S3Controller {

    @Get()
    getHello(): any {
        return 'Hello World! s3';
    }
}
