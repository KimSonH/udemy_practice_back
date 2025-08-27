import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsNotEmpty,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import { CreateCourseSessionDto } from 'src/course-sessions/dto/create-course-session.dto';

export class VideoCourseDto {
  @ApiProperty({ description: 'Id of the course' })
  @IsNumber()
  @IsOptional()
  id?: number;

  @ApiProperty({ description: 'Name of the course' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Description of the course' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: 'Price of the course' })
  @IsNumber()
  @IsNotEmpty()
  price: number;

  @ApiProperty({ description: 'Status of the course' })
  @IsString()
  @IsNotEmpty()
  status: string;

  @ApiProperty({ description: 'Type of the course' })
  @IsString()
  @IsNotEmpty()
  type: string;

  @ApiProperty({ description: 'Organization id of the course' })
  @IsString()
  @IsNotEmpty()
  organizationId: string;

  @ApiProperty({ description: 'Content of the course' })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiProperty({ description: 'Thumbnail image url of the course' })
  @IsString()
  @IsNotEmpty()
  thumbnailImageUrl: string;

  @ValidateNested({ each: true })
  courseSessions: CreateCourseSessionDto[];
}
