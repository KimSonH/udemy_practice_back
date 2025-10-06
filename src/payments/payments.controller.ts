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

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  create(@Body() createPaymentDto: CreatePaymentDto) {
    return this.paymentsService.create(createPaymentDto);
  }

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

  @Get()
  findAll() {
    return this.paymentsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.paymentsService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updatePaymentDto: UpdatePaymentDto) {
    return this.paymentsService.update(+id, updatePaymentDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.paymentsService.remove(+id);
  }
}
