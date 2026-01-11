import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SePayPgClient } from 'sepay-pg-node';
import { createHmac } from 'crypto';

interface SepayCheckoutParams {
  operation?: 'PURCHASE';
  invoiceNumber: string;
  amount: number;
  description: string;
  customerId?: string;
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
    const env = (this.configService.get<'sandbox' | 'production'>(
      'SEPAY_ENV',
    ) ?? 'sandbox') as 'sandbox' | 'production';
    const merchantId =
      this.configService.get<string>('SEPAY_MERCHANT_ID') ?? '';
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

  /**
   * Sign fields theo logic PHP
   * Chỉ ký các fields được phép: merchant, operation, payment_method, order_amount, currency,
   * order_invoice_number, order_description, customer_id, success_url, error_url, cancel_url
   */
  private signFields(fields: Record<string, any>, secretKey: string): string {
    const allowedFields = [
      'merchant',
      'operation',
      'payment_method',
      'order_amount',
      'currency',
      'order_invoice_number',
      'order_description',
      'customer_id',
      'success_url',
      'error_url',
      'cancel_url',
    ];

    const signed: string[] = [];
    const signedFields = Object.keys(fields).filter((field) =>
      allowedFields.includes(field),
    );

    for (const field of signedFields) {
      if (fields[field] === undefined || fields[field] === null) continue;
      signed.push(`${field}=${fields[field] ?? ''}`);
    }

    const message = signed.join(',');
    const hmac = createHmac('sha256', secretKey);
    hmac.update(message);
    return hmac.digest('base64');
  }

  initOneTimePaymentFields(params: SepayCheckoutParams) {
    const currency =
      params.currency ??
      this.configService.get<string>('SEPAY_CURRENCY') ??
      'VND';
    const successUrl =
      params.successUrl ?? this.configService.get<string>('SEPAY_SUCCESS_URL');
    const errorUrl =
      params.errorUrl ?? this.configService.get<string>('SEPAY_ERROR_URL');
    const cancelUrl =
      params.cancelUrl ?? this.configService.get<string>('SEPAY_CANCEL_URL');
    const merchantId =
      this.configService.get<string>('SEPAY_MERCHANT_ID') ?? '';
    const secretKey = this.configService.get<string>('SEPAY_SECRET_KEY') ?? '';

    const fields: Record<string, any> = {
      merchant: merchantId,
      currency,
      order_amount: params.amount,
      operation: 'PURCHASE',
      order_description: params.description,
      order_invoice_number: params.invoiceNumber,
      customer_id: params.customerId,
      success_url: successUrl,
      error_url: errorUrl,
      cancel_url: cancelUrl,
    };

    if (params.customData) {
      fields.custom_data = params.customData;
    }

    const signature = this.signFields(fields, secretKey);
    fields.signature = signature;

    const orderedFields: Record<string, any> = {};
    const fieldOrder = [
      'merchant',
      'currency',
      'order_amount',
      'operation',
      'order_description',
      'order_invoice_number',
      'customer_id',
      'success_url',
      'error_url',
      'cancel_url',
      'signature',
      'custom_data',
    ];

    for (const key of fieldOrder) {
      if (
        fields[key] !== undefined &&
        fields[key] !== null &&
        fields[key] !== ''
      ) {
        orderedFields[key] = fields[key];
      }
    }

    for (const key in fields) {
      if (
        !fieldOrder.includes(key) &&
        fields[key] !== undefined &&
        fields[key] !== null &&
        fields[key] !== ''
      ) {
        orderedFields[key] = fields[key];
      }
    }

    return {
      checkoutUrl: this.getCheckoutUrl(),
      fields: orderedFields,
    };
  }

  verifySignature(payload: Record<string, any>) {
    const { signature, ...fields } = payload ?? {};

    if (!signature) {
      this.logger.warn('Signature is missing from SePay payload');
      return false;
    }

    const secretKey = this.configService.get<string>('SEPAY_SECRET_KEY') ?? '';
    const expectedSignature = this.signFields(fields, secretKey);
    return expectedSignature === signature;
  }
}
