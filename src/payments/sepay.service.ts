import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SePayPgClient } from 'sepay-pg-node';
import { SepayPaymentMethod } from './dto/create-sepay-payment.dto';

interface SepayCheckoutParams {
  invoiceNumber: string;
  amount: number;
  description: string;
  customerId?: string;
  paymentMethod?: SepayPaymentMethod;
  successUrl?: string;
  errorUrl?: string;
  cancelUrl?: string;
  customData?: string;
  currency?: string;
}

@Injectable()
export class SepayService {
  private readonly logger = new Logger(SepayService.name);
  private client: SePayPgClient;

  constructor(private readonly configService: ConfigService) {
    this.client = this.createClient();
  }

  private createClient() {
    const env =
      (this.configService.get<'sandbox' | 'production'>('SEPAY_ENV') ??
        'sandbox') as 'sandbox' | 'production';
    const merchantId = this.configService.get<string>('SEPAY_MERCHANT_ID') ?? '';
    const secretKey = this.configService.get<string>('SEPAY_SECRET_KEY') ?? '';
    return new SePayPgClient({
      env,
      merchant_id: merchantId,
      secret_key: secretKey,
    });
  }

  isConfigured() {
    return Boolean(
      this.configService.get('SEPAY_MERCHANT_ID') &&
        this.configService.get('SEPAY_SECRET_KEY'),
    );
  }

  getCheckoutUrl() {
    return this.client.checkout.initCheckoutUrl();
  }

  initOneTimePaymentFields(params: SepayCheckoutParams) {
    const currency =
      params.currency ??
      this.configService.get<string>('SEPAY_CURRENCY') ??
      'VND';
    const paymentMethod =
      params.paymentMethod ??
      (this.configService.get<SepayPaymentMethod>('SEPAY_PAYMENT_METHOD') ??
        'BANK_TRANSFER');
    const successUrl =
      params.successUrl ?? this.configService.get<string>('SEPAY_SUCCESS_URL');
    const errorUrl =
      params.errorUrl ?? this.configService.get<string>('SEPAY_ERROR_URL');
    const cancelUrl =
      params.cancelUrl ?? this.configService.get<string>('SEPAY_CANCEL_URL');

    const fields = this.client.checkout.initOneTimePaymentFields({
      payment_method: paymentMethod,
      order_invoice_number: params.invoiceNumber,
      order_amount: params.amount,
      currency,
      order_description: params.description,
      customer_id: params.customerId,
      success_url: successUrl,
      error_url: errorUrl,
      cancel_url: cancelUrl,
      custom_data: params.customData,
    });

    return {
      checkoutUrl: this.getCheckoutUrl(),
      fields,
    };
  }

  verifySignature(payload: Record<string, any>) {
    const { signature, ...fields } = payload ?? {};

    if (!signature) {
      this.logger.warn('Signature is missing from SePay payload');
      return false;
    }

    const sanitizedFields = Object.entries(fields).reduce(
      (acc, [key, value]) => {
        if (value === undefined || value === null || value === '') {
          return acc;
        }
        acc[key] = value;
        return acc;
      },
      {} as Record<string, any>,
    );

    const expectedSignature =
      this.client.checkout.signFields(sanitizedFields);
    return expectedSignature === signature;
  }
}

