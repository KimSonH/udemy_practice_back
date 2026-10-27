import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GumroadUpload } from './gumroad-upload.entity';
import { GumroadVideoStatus } from './gumroad-video-status.entity';
import { GumroadController } from './gumroad.controller';
import { GumroadService } from './gumroad.service';

@Module({
  imports: [
    JwtModule,
    TypeOrmModule.forFeature([GumroadUpload, GumroadVideoStatus]),
  ],
  controllers: [GumroadController],
  providers: [GumroadService],
  exports: [GumroadService],
})
export class GumroadModule {}
