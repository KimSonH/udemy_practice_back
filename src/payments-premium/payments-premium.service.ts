import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import {
  Client,
  Environment,
  LogLevel,
  OrdersController,
  ApiError,
  CheckoutPaymentIntent,
} from '@paypal/paypal-server-sdk';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { CreateOrderPremiumDto } from './dto/create-order-premium.dto';
import { User } from 'src/users/entities/user.entity';
import { UserPremiumsService } from 'src/user-premium/user-premium.service';

@Injectable()
export class PaymentsPremiumService {
  private readonly logger = new Logger(PaymentsPremiumService.name);
  private readonly client: Client;

  constructor(
    private readonly configService: ConfigService,
    private readonly userPremiumService: UserPremiumsService,
    private readonly jwtService: JwtService,
  ) {
    this.client = new Client({
      clientCredentialsAuthCredentials: {
        oAuthClientId: this.configService.get('PAYPAL_CLIENT_ID'),
        oAuthClientSecret: this.configService.get('PAYPAL_CLIENT_SECRET'),
      },
      environment: Environment.Sandbox,
      logging: {
        logLevel: LogLevel.Info,
        logRequest: { logBody: true },
        logResponse: { logHeaders: true },
      },
    });
  }

  private ordersController() {
    return new OrdersController(this.client);
  }

  async createOrder(user: User, dto: CreateOrderPremiumDto) {
    const { accountEmail, price } = dto;

    const collect = {
      body: {
        intent: CheckoutPaymentIntent.Capture,
        purchaseUnits: [
          {
            amount: {
              currencyCode: 'USD',
              value: price.toString(),
              breakdown: {
                itemTotal: {
                  currencyCode: 'USD',
                  value: price.toString(),
                },
              },
            },
          },
        ],
      },
      prefer: 'return=minimal',
    };

    try {
      const { body } = await this.ordersController().createOrder(collect);
      const response = JSON.parse(body.toString());

      await this.userPremiumService.create({
        userId: user.id,
        accountEmail,
        orderId: response.id,
        status: 'pending',
        orderData: null,
        orderBy: 'paypal',
      });

      return {
        orderId: response.id,
        status: 'pending',
      };
    } catch (error) {
      if (error instanceof ApiError) {
        throw new Error(error.message);
      }
      throw error;
    }
  }

  async verifySession(session: string) {
    try {
      const payload = this.jwtService.verify(session, {
        secret: this.configService.get('JWT_VERIFICATION_TOKEN_SECRET'),
      });
      if (
        typeof payload === 'object' &&
        'userId' in payload &&
        'courseId' in payload &&
        'userCourseId' in payload
      ) {
        return payload;
      }
      throw new BadRequestException('Invalid session');
    } catch (error) {
      throw new BadRequestException('Invalid session');
    }
  }

  async captureOrder(orderID: string, user: User, accountEmail: string) {
    try {
      const { body } = await this.ordersController().captureOrder({
        id: orderID,
        prefer: 'return=minimal',
      });
      const response = JSON.parse(body.toString());

      const status = response.status === 'COMPLETED' ? 'completed' : 'failed';
      await this.userPremiumService.updateStatus(user.id, accountEmail, status);

      return {
        orderId: orderID,
        status: response.status,
      };
    } catch (error) {
      if (error instanceof ApiError) {
        throw new Error(error.message);
      }
      throw error;
    }
  }

  async generateLinkSessionPremium(userId: number, accountEmail: string) {
    const userPremium = await this.createUserPremiumWithStatus({
      userId,
      accountEmail,
      status: 'pending',
    });

    const payload = {
      userId,
      accountEmail,
      userPremiumId: userPremium.id,
    };

    const token = this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_VERIFICATION_TOKEN_SECRET'),
      expiresIn: `${this.configService.get('JWT_VERIFICATION_TOKEN_EXPIRATION_TIME')}s`,
    });

    return token;
  }

  async createUserPremiumWithStatus(body: {
    userId: number;
    accountEmail: string;
    status: 'pending' | 'completed' | 'failed';
  }) {
    const { userId, accountEmail, status } = body;

    if (!accountEmail) {
      throw new BadRequestException('Account email is required');
    }

    try {
      const userPremium = await this.userPremiumService.create({
        userId,
        accountEmail,
        orderData: null,
        orderId: null,
        orderBy: 'vietqr',
        status,
      });

      return userPremium;
    } catch (error) {
      throw new Error(error.message);
    }
  }

  async updateUserPremiumWithStatus(
    body: {
      userPremiumId: number;
    },
    status: 'pending' | 'completed' | 'failed',
  ) {
    const userPremium = await this.userPremiumService.findOne(
      body.userPremiumId,
    );

    if (!userPremium) {
      throw new BadRequestException('UserPremium not found');
    }

    await this.userPremiumService.update(userPremium.id, {
      status,
    });
  }
}
