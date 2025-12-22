import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Req,
  Query,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { CreateOrderDto } from './dto/create-order.dto';
import JwtAuthenticationGuard from 'src/authentication/guard/jwt-authentication.guard';
import { RequestWithUser } from 'src/authentication/requestWithUser.interface';
import { GenerateSessionDto } from './dto/generate-session.dto';
import { CreateSepayPaymentDto } from './dto/create-sepay-payment.dto';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { WebhookGuard } from './guard/webhook.guard';
import { IpnGuard } from './guard/ipn.guard';
import { SepayIPNDto } from './dto/ipn.dto';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @UseGuards(JwtAuthenticationGuard)
  @Post('/orders')
  async orders(
    @Req() req: RequestWithUser,
    @Body() createOrderDto: CreateOrderDto,
  ) {
    const res = await this.paymentsService.createOrder(
      req.user,
      createOrderDto,
    );
    return res;
  }

  @UseGuards(JwtAuthenticationGuard)
  @Post('/orders/:orderID/capture')
  async captureOrder(
    @Param('orderID') orderID: string,
    @Body() { userCourseId }: { userCourseId: number },
    @Req() request: RequestWithUser,
  ) {
    const res = await this.paymentsService.captureOrder(orderID, userCourseId);
    return res;
  }

  @Get('generate-session')
  async generateSession(@Query() query: GenerateSessionDto) {
    return this.paymentsService.generateLinkSession(query);
  }

  @Post('verify-session')
  async verifySession(@Body() body: { sessionId: string }) {
    const verify = await this.paymentsService.verifySession(body.sessionId);
    return await this.paymentsService.updateUserCourseWithStatus(
      verify,
      'completed',
    );
  }

  @UseGuards(JwtAuthenticationGuard)
  @Post('sepay/checkout')
  async createSepayCheckout(
    @Req() req: RequestWithUser,
    @Body() body: CreateSepayPaymentDto,
  ) {
    return this.paymentsService.createSepayCheckout(req.user, body);
  }

  @Post('sepay/webhook')
  @UseGuards(WebhookGuard)
  async handleSepayWebhook(@Body() payload: CreateTransactionDto) {
    return this.paymentsService.handleSepayWebhook(payload);
  }

  @Post('sepay/ipn')
  @UseGuards(IpnGuard)
  async handleSepayIpn(@Body() payload: SepayIPNDto) {
    return this.paymentsService.handleSepayIpn(payload);
  }
}
