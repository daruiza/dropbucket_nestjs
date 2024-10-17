import { Module } from '@nestjs/common';
import { S3Controller } from './s3/s3.controller';

@Module({
  controllers: [S3Controller]
})
export class BucketModule {}
