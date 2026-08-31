import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class ToggleVisibilityDto {
  @ApiProperty({ description: 'Trạng thái hiển thị mới' })
  @IsBoolean()
  isVisible: boolean;
}
