import { PartialType } from '@nestjs/swagger';
import { CreateBucketDto } from './create-bucket.dto';

export class UpdateBucketDto extends PartialType(CreateBucketDto) {}
