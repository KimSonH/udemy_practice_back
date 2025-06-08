import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { MassAccountsService } from './mass-account.service';
import { GetMassAccountDto } from './dto/createMassAccount';

@ApiTags('Mass Accounts')
@Controller('mass-accounts')
export class MassAccountsController {
  constructor(private readonly massAccountsService: MassAccountsService) {}

  @Get()
  @ApiOperation({ summary: 'Get Mass Accounts' })
  @ApiQuery({ name: 'page', required: false, example: '1' })
  @ApiQuery({ name: 'limit', required: false, example: '10' })
  @ApiQuery({ name: 'search', required: false, example: 'CISSP' })
  async getMassAccounts(@Query() query: GetMassAccountDto) {
    return await this.massAccountsService.getMassAccounts(query);
  }
}
