import { Injectable } from '@nestjs/common';
import PayOS from '@payos/node';

@Injectable()
export class PayOSService {
  private readonly payos: PayOS;

  constructor() {
    this.payos = new PayOS('', '', '');
  }

  async createPaymentLinkPayOs(data: any) {
    return this.payos.createPaymentLink(data);
  }
}
