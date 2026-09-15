import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class ToggleVisibilityDto {
  @ApiProperty({ description: 'New visibility state' })
  @IsBoolean()
  isVisible: boolean;
}
