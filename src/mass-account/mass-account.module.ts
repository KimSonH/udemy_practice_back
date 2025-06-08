import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { MassAccountsService } from './mass-account.service';
import { MassAccountsController } from './mass-account.controller';

@Module({
  imports: [HttpModule],
  controllers: [MassAccountsController],
  providers: [MassAccountsService],
})
export class MassAccountsModule {}
