import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { GumroadController } from './gumroad.controller';
import { GumroadService } from './gumroad.service';

@Module({
  imports: [JwtModule],
  controllers: [GumroadController],
  providers: [GumroadService],
})
export class GumroadModule {}
