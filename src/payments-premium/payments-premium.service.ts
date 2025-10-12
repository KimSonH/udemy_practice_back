import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import {
  Client,
  Environment,
  LogLevel,
  OrdersController,
  ApiError,
  CheckoutPaymentIntent,
  PaymentsController,
} from '@paypal/paypal-server-sdk';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { CreateOrderPremiumDto } from './dto/create-order-premium.dto';
import { User } from 'src/users/entities/user.entity';
import { UserPremiumsService } from 'src/user-premium/user-premium.service';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class PaymentsPremiumService {
  private readonly logger = new Logger(PaymentsPremiumService.name);
  private readonly client: Client;
  private readonly ordersController: OrdersController;
  private readonly paymentsController: PaymentsController;

  constructor(
    private readonly configService: ConfigService,
    private readonly userPremiumService: UserPremiumsService,
    private readonly jwtService: JwtService,
    private readonly httpService: HttpService,
  ) {
    this.client = new Client({
      clientCredentialsAuthCredentials: {
        oAuthClientId: this.configService.get('PAYPAL_CLIENT_ID'),
        oAuthClientSecret: this.configService.get('PAYPAL_CLIENT_SECRET'),
      },
      timeout: 0,
      environment:
        this.configService.get('NODE_ENV') === 'production'
          ? Environment.Production
          : Environment.Sandbox,
      logging: {
        logLevel: LogLevel.Info,
        logRequest: { logBody: true },
        logResponse: { logHeaders: true },
      },
    });
    this.ordersController = new OrdersController(this.client);
    this.paymentsController = new PaymentsController(this.client);
  }

  async createOrder(user: User, dto: CreateOrderPremiumDto) {
    const { accountEmail, price, accountId } = dto;

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
      const { body, ...httpResponse } =
        await this.ordersController.createOrder(collect);
      const response = JSON.parse(body.toString());

      this.logger.log(
        `Order account premium created successfully: ${response.id}`,
      );

      if (response.id) {
        const userCourse = await this.userPremiumService.create({
          userId: user.id,
          accountEmail,
          accountId,
          orderId: response.id,
          status: 'pending',
          orderData: JSON.stringify(response),
          orderBy: 'paypal',
        });

        return {
          jsonResponse: response,
          httpStatusCode: httpResponse.statusCode,
          userCourseId: userCourse.id,
        };
      }

      return {
        jsonResponse: response,
        httpStatusCode: httpResponse.statusCode,
        userCourseId: null,
      };
    } catch (error) {
      this.logger.error('Error creating order', error?.message || error);
      if (error instanceof ApiError) {
        throw new BadRequestException(error.message);
      }
      throw new BadRequestException('Unable to create PayPal order');
    }
  }

  async captureOrder(
    orderID: string,
    user: User,
    accountEmail: string,
    accountId: number,
  ) {
    try {
      const { body } = await this.ordersController.captureOrder({
        id: orderID,
        prefer: 'return=minimal',
      });

      const response = JSON.parse(body.toString());
      const paypalStatus = response.status;

      const status: 'completed' | 'failed' =
        paypalStatus === 'COMPLETED' ? 'completed' : 'failed';

      await this.userPremiumService.updateStatusByAccountId(
        user.id,
        accountId,
        accountEmail,
        status,
      );

      if (status === 'completed') {
        try {
          const privateKey = this.configService.get('MASS_PRIVATE_KEY');
          const result = await firstValueFrom(
            this.httpService.post(
              'http://localhost:3304/api/account-service/sold-account',
              { account_id: Number(accountId) },
              {
                headers: {
                  'Content-Type': 'application/json',
                  'x-Private-key': privateKey,
                },
              },
            ),
          );

          this.logger.log('Account marked as sold successfully.');
          return result.data;
        } catch (err) {
          this.logger.error(
            'Call API sold-account failed',
            err?.message || err,
          );
        }
      }

      return {
        orderId: orderID,
        status: paypalStatus,
      };
    } catch (error) {
      this.logger.error('Error capturing order', error?.message || error);
      if (error instanceof ApiError) {
        throw new BadRequestException(error.message);
      }
      throw new BadRequestException('Unable to capture PayPal order');
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
        'accountEmail' in payload &&
        'userPremiumId' in payload
      ) {
        return payload;
      }
      throw new BadRequestException('Invalid session');
    } catch (error) {
      throw new BadRequestException('Invalid session');
    }
  }

  async generateLinkSessionPremium(
    userId: number,
    accountEmail: string,
    accountId: number,
    orderBy: string,
  ) {
    const userPremium = await this.createUserPremiumWithStatus({
      userId,
      accountEmail,
      status: 'pending',
      accountId,
      orderBy,
    });

    const payload = {
      userId,
      accountEmail,
      userPremiumId: userPremium.id,
    };

    const token = this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_VERIFICATION_TOKEN_SECRET'),
      expiresIn: `${this.configService.get(
        'JWT_VERIFICATION_TOKEN_EXPIRATION_TIME',
      )}s`,
    });

    return token;
  }

  async createUserPremiumWithStatus(body: {
    userId: number;
    accountEmail: string;
    status: 'pending' | 'completed' | 'failed';
    accountId: number;
    orderBy: string;
  }) {
    const { userId, accountEmail, status, accountId, orderBy } = body;

    if (!accountEmail) {
      throw new BadRequestException('Account email is required');
    }

    try {
      const userPremium = await this.userPremiumService.create({
        userId,
        accountEmail,
        orderData: null,
        accountId,
        orderId: null,
        orderBy,
        status,
      });

      return userPremium;
    } catch (error) {
      this.logger.error(
        'Failed to create user premium',
        error?.message || error,
      );
      throw new BadRequestException('Could not create premium access');
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

    if (userPremium.status === 'completed') {
      throw new BadRequestException('User premium already purchased');
    }

    await this.userPremiumService.update(userPremium.id, {
      status,
    });
  }
}
