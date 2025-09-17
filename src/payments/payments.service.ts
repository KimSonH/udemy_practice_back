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
  }) {
    const { userId, courseId, status, orderBy } = body;
    const course = await this.coursesService.getCourseById(+courseId);
    if (!course) {
      throw new BadRequestException('User course not found');
    }
    try {
      const userCourse = await this.userCoursesService.create({
        courseId,
        userId,
        orderData: null,
        orderId: null,
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
    await this.userCoursesService.update(userCourse.id, {
      status,
    });
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
