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
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

@ApiTags('Payment Premium Accounts')
@Controller('payments-premium')
export class PaymentsPremiumController {
  constructor(
    private readonly paymentsPremiumService: PaymentsPremiumService,
    private readonly userPremiumService: UserPremiumsService,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
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
    if (!body.sessionId || body.sessionId === 'undefined') {
      throw new BadRequestException('SessionId is required');
    }

    const verify = await this.paymentsPremiumService.verifySession(
      body.sessionId,
    );

    await this.paymentsPremiumService.updateUserPremiumWithStatus(
      verify,
      'completed',
    );

    const userPremium = await this.userPremiumService.findOne(
      verify.userPremiumId,
    );
    console.log('UserPremium', userPremium);

    try {
      const privateKey = this.configService.get('MASS_PRIVATE_KEY');
       await firstValueFrom(
        this.httpService.post(
          'http://localhost:3304/api/account-service/sold-account',
          { account_id: Number(userPremium.accountId) },
          {
            headers: {
              'Content-Type': 'application/json',
              'x-Private-key': privateKey,
            },
          },
        ),
      );
      console.log('Account marked as sold.');
    } catch (err) {
      console.error(
        'Failed to mark account as sold',
        err?.response?.data || err.message || err,
      );
      throw new InternalServerErrorException('Failed to mark account as sold');
    }

    const soldAccountInfo = await this.userPremiumService.getSoldAccountInfo(
      userPremium.accountId,
    );
    const soldItem = soldAccountInfo?.data?.items;

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
