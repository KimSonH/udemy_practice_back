import { PartialType } from '@nestjs/swagger';
import { CreateUserPremiumDto } from './create-user-premium.dto';

export class UpdateUserPremiumDto extends PartialType(CreateUserPremiumDto) {}
