import {
  Controller,
  Post,
  Body,
  Param,
  Req,
  UseGuards,
  Get,
  Query,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PaymentsPremiumService } from './payments-premium.service';
import { CreateOrderPremiumDto } from './dto/create-order-premium.dto';
import JwtAuthenticationGuard from 'src/authentication/guard/jwt-authentication.guard';
import { RequestWithUser } from 'src/authentication/requestWithUser.interface';
import { ApiTags } from '@nestjs/swagger';
import { UserPremiumsService } from 'src/user-premium/user-premium.service';

@ApiTags('Payment Premium Accounts')
@Controller('payments-premium')
export class PaymentsPremiumController {
  constructor(
    private readonly paymentsPremiumService: PaymentsPremiumService,
    private readonly userPremiumService: UserPremiumsService,
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
       orderBy: string;
    },
  ) {
    return this.paymentsPremiumService.generateLinkSessionPremium(
      query.userId,
      query.accountEmail,
      query.accountId,
      query.orderBy,
    );
  }

@Post('verify-session')
async verifySession(@Body() body: { sessionId: string }) {
  const verify = await this.paymentsPremiumService.verifySession(body.sessionId);

  await this.paymentsPremiumService.updateUserPremiumWithStatus(
    verify,
    'completed',
  );

  const userPremium = await this.userPremiumService.findOne(verify.userPremiumId);
  console.log('userPremium', userPremium);

  const soldAccountInfo = await this.userPremiumService.getSoldAccountInfo(userPremium.accountId);
  console.log('soldAccountInfo', soldAccountInfo);

  const soldItem = soldAccountInfo?.data?.items;
  console.log('soldItem', soldItem);

  if (!soldItem) {
    throw new BadRequestException('Sold account information not found');
  }

  return {
    status: true,
    message: 'Verification successful',
    data: {
      userEmail: userPremium.user.email,
      accountUsername: soldItem.email,
      accountPassword: soldItem.password,
    },
  };
}





}
