import {
  Controller,
  Post,
  Body,
  Param,
  Req,
  UseGuards,
  Get,
  Query,
} from '@nestjs/common';
import { PaymentsPremiumService } from './payments-premium.service';
import { CreateOrderPremiumDto } from './dto/create-order-premium.dto';
import JwtAuthenticationGuard from 'src/authentication/guard/jwt-authentication.guard';
import { RequestWithUser } from 'src/authentication/requestWithUser.interface';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Payment Premium Accounts')
@Controller('payments-premium')
export class PaymentsPremiumController {
  constructor(
    private readonly paymentsPremiumService: PaymentsPremiumService,
  ) {}

  @UseGuards(JwtAuthenticationGuard)
  @Post('/orders')
  createOrder(@Req() req: RequestWithUser, @Body() dto: CreateOrderPremiumDto) {
    return this.paymentsPremiumService.createOrder(req.user, dto);
  }

  @UseGuards(JwtAuthenticationGuard)
  @Post('/orders/:orderID/capture')
  captureOrder(
    @Param('orderID') orderID: string,
    @Req() req: RequestWithUser,
    @Body() body: { accountEmail: string; accountId: number },
  ) {
    return this.paymentsPremiumService.captureOrder(
      orderID,
      req.user,
      body.accountEmail,
      body.accountId,
    );
  }

  @Get('generate-session')
  async generateSession(
    @Query()
    query: {
      userId: number;
      accountEmail: string;
      accountId: number;
    },
  ) {
    return this.paymentsPremiumService.generateLinkSessionPremium(
      query.userId,
      query.accountEmail,
      query.accountId,
    );
  }

  @Post('verify-session')
  async verifySession(@Body() body: { sessionId: string }) {
    const verify = await this.paymentsPremiumService.verifySession(
      body.sessionId,
    );
    await this.paymentsPremiumService.updateUserPremiumWithStatus(
      verify,
      'completed',
    );
  }
}
