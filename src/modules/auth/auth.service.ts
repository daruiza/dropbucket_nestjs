import { Injectable } from '@nestjs/common';

@Injectable()
export class AuthService {
    getUser() {
        return {
            name:'userName',
            bucket:'s3/bucket'
        }
    }
}
