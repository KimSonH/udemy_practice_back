import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import {
  Client,
  Environment,
  LogLevel,
  OrdersController,
  PaymentsController,
  ApiError,
  CheckoutPaymentIntent,
  OrderApplicationContextLandingPage,
  OrderApplicationContextUserAction,
} from '@paypal/paypal-server-sdk';
import { CreateOrderDto } from './dto/create-order.dto';
import { UserCoursesService } from 'src/user-courses/user-courses.service';
import { CoursesService } from 'src/courses/courses.service';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { User } from 'src/users/entities/user.entity';
import { GenerateSessionDto } from './dto/generate-session.dto';
import { CreateSepayPaymentDto } from './dto/create-sepay-payment.dto';
import { SepayService } from './sepay.service';
import { SepayWebhookDto } from './dto/sepay-webhook.dto';
import { randomBytes } from 'crypto';
@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private readonly client: Client;
  private readonly ordersController: OrdersController;
  private readonly paymentsController: PaymentsController;

  constructor(
    private readonly configService: ConfigService,
    private readonly userCoursesService: UserCoursesService,
    private readonly coursesService: CoursesService,
    private readonly jwtService: JwtService,
    private readonly sepayService: SepayService,
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

  async createOrder(user: User, createOrderDto: CreateOrderDto) {
    const { courseId, price } = createOrderDto;
    await this.coursesService.getCourseById(courseId);
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
            // lookup item details in `cart` from database
            // items: [
            //   {
            //     name: 'T-Shirt',
            //     unitAmount: {
            //       currencyCode: 'USD',
            //       value: '1',
            //     },
            //     quantity: '1',
            //     description: 'Super Fresh Shirt',
            //     sku: 'sku01',
            //   },
            // ],
          },
        ],
      },
      prefer: 'return=minimal',
    };

    try {
      const { body, ...httpResponse } =
        await this.ordersController.createOrder(collect);

      const response = JSON.parse(body.toString());
      this.logger.log(`Order created successfully: ${response.id}`);

      if (response.id) {
        const userCourse = await this.userCoursesService.create({
          userId: user.id,
          courseId,
          orderId: response.id,
          orderData: JSON.stringify(response),
          orderBy: 'paypal',
          status: 'pending',
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
      if (error instanceof ApiError) {
        this.logger.error(`Error creating order: ${error.message}`);
        throw new Error(error.message);
      }
      throw error;
    }
  }

  async captureOrder(orderID: string, userCourseId: number) {
    const collect = {
      id: orderID,
      prefer: 'return=minimal',
    };
    const userCourse = await this.userCoursesService.findOne(userCourseId);
    try {
      const { body, ...httpResponse } =
        await this.ordersController.captureOrder(collect);
      // Get more response info...
      // const { statusCode, headers } = httpResponse;

      if (httpResponse.statusCode === 201) {
        const response = JSON.parse(body.toString());
        const { status } = response;
        if (status === 'COMPLETED') {
          await this.userCoursesService.update(userCourse.id, {
            status: 'completed',
          });
        } else {
          await this.userCoursesService.update(userCourse.id, {
            status: 'failed',
          });
        }
      }
      return {
        jsonResponse: JSON.parse(body.toString()),
        httpStatusCode: httpResponse.statusCode,
        userCourseId: userCourse.id,
      };
    } catch (error) {
      if (error instanceof ApiError) {
        // const { statusCode, headers } = error;
        throw new Error(error.message);
      }
    }
  }

  async generateLinkSession(body: GenerateSessionDto) {
    const { userId, courseId, orderBy } = body;
    const userCourse = await this.createUserCourseWithStatus({
      userId,
      courseId,
      status: 'pending',
      orderBy,
    });
    const payload: {
      userId: number;
      courseId: number;
      userCourseId: number;
    } = { userId, courseId, userCourseId: userCourse.id };
    const token = this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_VERIFICATION_TOKEN_SECRET'),
      expiresIn: `${this.configService.get('JWT_VERIFICATION_TOKEN_EXPIRATION_TIME')}s`,
    });
    return token;
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

  async createUserCourseWithStatus(body: {
    userId: number;
    courseId: number;
    status: 'pending' | 'completed' | 'failed';
    orderBy: string;
    orderId?: string;
    orderData?: string | null;
  }) {
    const { userId, courseId, status, orderBy, orderId, orderData } = body;
    const course = await this.coursesService.getCourseById(+courseId);
    if (!course) {
      throw new BadRequestException('User course not found');
    }
    try {
      const userCourse = await this.userCoursesService.create({
        courseId,
        userId,
        orderData: orderData ?? null,
        orderId: orderId ?? null,
        orderBy,
        status,
      });
      return userCourse;
    } catch (error) {
      throw new Error(error.message);
    }
  }

  async updateUserCourseWithStatus(
    body: {
      userCourseId: number;
      userId: number;
      courseId: number;
    },
    status: 'pending' | 'completed' | 'failed',
  ) {
    const { userCourseId } = body;
    const userCourse = await this.userCoursesService.findOne(userCourseId);
    if (userCourse.status === 'completed') {
      throw new BadRequestException('User course already purchased');
    }
    await this.userCoursesService.update(userCourse.id, {
      status,
    });
    return userCourse;
  }

  async createSepayCheckout(user: User, body: CreateSepayPaymentDto) {
    if (!this.sepayService.isConfigured()) {
      throw new BadRequestException(
        'SePay credentials are not configured. Please update the environment variables.',
      );
    }

    const course = await this.coursesService.getCourseById(body.courseId);
    if (!course?.price) {
      throw new BadRequestException('Course price is not configured yet');
    }

    const amount = Math.round(Number(course.price));
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new BadRequestException('Invalid course price for SePay');
    }

    const invoiceNumber = this.buildSepayInvoiceNumber(user.id, course.id);
    const userCourse = await this.createUserCourseWithStatus({
      userId: user.id,
      courseId: course.id,
      status: 'pending',
      orderBy: 'sepay',
      orderId: invoiceNumber,
      orderData: '{}',
    });

    const customData = JSON.stringify({
      userCourseId: userCourse.id,
      userId: user.id,
      courseId: course.id,
    });

    const description = `${course.name}`;
    const payload: {
      userId: number;
      courseId: number;
      userCourseId: number;
    } = { userId: user.id, courseId: course.id, userCourseId: userCourse.id };
    const token = this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_VERIFICATION_TOKEN_SECRET'),
      expiresIn: `${this.configService.get('JWT_VERIFICATION_TOKEN_EXPIRATION_TIME')}s`,
    });
    const successUrl = `${this.configService.get('SITE_URL')}/payments-session?sessionId=${token}`;
    const errorUrl = `${this.configService.get('SITE_URL')}/courses/${course.id}`;
    const cancelUrl = `${this.configService.get('SITE_URL')}/courses/${course.id}`;
    const checkoutPayload = this.sepayService.initOneTimePaymentFields({
      invoiceNumber,
      amount: amount * 26000,
      description,
      customerId: String(user.id),
      successUrl,
      errorUrl,
      cancelUrl,
    });

    console.log(checkoutPayload);

    await this.userCoursesService.update(userCourse.id, {
      orderData: JSON.stringify(checkoutPayload.fields),
    });

    return {
      checkoutUrl: checkoutPayload.checkoutUrl,
      fields: checkoutPayload.fields,
      userCourseId: userCourse.id,
    };
  }

  async handleSepayWebhook(payload: SepayWebhookDto) {
    if (!this.sepayService.isConfigured()) {
      throw new BadRequestException(
        'SePay credentials are not configured. Please update the environment variables.',
      );
    }

    const isValidSignature = this.sepayService.verifySignature(payload);
    if (!isValidSignature) {
      throw new BadRequestException('Invalid SePay signature');
    }

    const userCourse = await this.userCoursesService.findOneByOrderId(
      payload.order_invoice_number,
    );

    const resolvedStatus = this.resolveSepayStatus(
      payload.order_status ?? payload.payment_status,
    );

    const updated = await this.userCoursesService.update(userCourse.id, {
      status: resolvedStatus,
      orderData: JSON.stringify(payload),
    });

    return {
      userCourseId: updated.id,
      status: updated.status,
    };
  }

  private buildSepayInvoiceNumber(userId: number, courseId: number) {
    const randomSuffix = randomBytes(4).toString('hex').toUpperCase();
    return `SEP-${userId}-${courseId}-${Date.now()}-${randomSuffix}`;
  }

  private resolveSepayStatus(status?: string) {
    const normalized = status?.toUpperCase();
    if (!normalized) {
      return 'pending';
    }
    if (['PAID', 'SUCCESS', 'COMPLETED'].includes(normalized)) {
      return 'completed';
    }
    if (['CANCELED', 'FAILED', 'ERROR', 'VOID'].includes(normalized)) {
      return 'failed';
    }
    return 'pending';
  }

  create(createPaymentDto: CreatePaymentDto) {
    return 'This action adds a new payment';
  }

  findAll() {
    return `This action returns all payments`;
  }

  findOne(id: number) {
    return `This action returns a #${id} payment`;
  }

  update(id: number, updatePaymentDto: UpdatePaymentDto) {
    return `This action updates a #${id} payment`;
  }

  remove(id: number) {
    return `This action removes a #${id} payment`;
  }
}
