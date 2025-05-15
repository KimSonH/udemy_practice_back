import { Injectable, Logger } from '@nestjs/common';
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
@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private readonly client: Client;

  constructor(
    private readonly configService: ConfigService,
    private readonly userCoursesService: UserCoursesService,
    private readonly coursesService: CoursesService,
  ) {
    this.client = new Client({
      clientCredentialsAuthCredentials: {
        oAuthClientId: this.configService.get('PAYPAL_CLIENT_ID'),
        oAuthClientSecret: this.configService.get('PAYPAL_CLIENT_SECRET'),
      },
      timeout: 0,
      environment: Environment.Sandbox,
      logging: {
        logLevel: LogLevel.Info,
        logRequest: { logBody: true },
        logResponse: { logHeaders: true },
      },
    });
  }

  ordersController() {
    return new OrdersController(this.client);
  }

  paymentsController() {
    return new PaymentsController(this.client);
  }

  async createOrder(createOrderDto: CreateOrderDto) {
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
        await this.ordersController().createOrder(collect);

      const response = JSON.parse(body.toString());
      this.logger.log(`Order created successfully: ${response.id}`);

      return {
        jsonResponse: response,
        httpStatusCode: httpResponse.statusCode,
      };
    } catch (error) {
      if (error instanceof ApiError) {
        this.logger.error(`Error creating order: ${error.message}`);
        throw new Error(error.message);
      }
      throw error;
    }
  }

  async captureOrder(orderID: string, courseId: number, userId: number) {
    const collect = {
      id: orderID,
      prefer: 'return=minimal',
    };
    await this.coursesService.getCourseById(courseId);
    try {
      const { body, ...httpResponse } =
        await this.ordersController().captureOrder(collect);
      // Get more response info...
      // const { statusCode, headers } = httpResponse;

      if (httpResponse.statusCode === 201) {
        const response = JSON.parse(body.toString());
        const { status } = response;
        if (status === 'COMPLETED') {
          await this.userCoursesService.create({
            userId,
            courseId,
            orderId: orderID,
            orderData: JSON.stringify(response),
          });
        }
      }
      return {
        jsonResponse: JSON.parse(body.toString()),
        httpStatusCode: httpResponse.statusCode,
      };
    } catch (error) {
      if (error instanceof ApiError) {
        // const { statusCode, headers } = error;
        throw new Error(error.message);
      }
    }
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
