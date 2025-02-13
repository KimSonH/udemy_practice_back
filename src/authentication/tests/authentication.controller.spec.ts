import { Test, TestingModule } from '@nestjs/testing';
import { AuthenticationController } from '../authentication.controller';
import { AuthenticationService } from '../authentication.service';
import { UsersService } from '../../users/users.service';
import { RegisterDto } from '../dto/register.dto';
import { ConfigService } from '@nestjs/config';

// Create mock services
const mockAuthenticationService = {
  register: jest.fn(),
  getCookieWithJwtAccessToken: jest.fn(),
  getCookieWithJwtRefreshToken: jest.fn(),
  getCookiesForLogOut: jest.fn(),
};

const mockUsersService = {
  setCurrentRefreshToken: jest.fn(),
  removeRefreshToken: jest.fn(),
  getUsers: jest.fn(),
};

describe('AuthenticationController', () => {
  let controller: AuthenticationController;
  let authService: AuthenticationService;
  let usersService: UsersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthenticationController],
      providers: [
        {
          provide: AuthenticationService,
          useValue: mockAuthenticationService,
        },
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<AuthenticationController>(AuthenticationController);
    authService = module.get<AuthenticationService>(AuthenticationService);
    usersService = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('register', () => {
    it('should call authenticationService.register with correct data', async () => {
      const registerDto: RegisterDto = {
        email: 'test@test.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
      };

      await controller.register(registerDto);
      expect(mockAuthenticationService.register).toHaveBeenCalledWith(
        registerDto,
      );
    });
  });

  describe('logIn', () => {
    it('should return user and set cookies', async () => {
      const user = {
        id: 1,
        email: 'test@test.com',
      };
      const request = {
        user,
        res: {
          setHeader: jest.fn(),
        },
      };

      mockAuthenticationService.getCookieWithJwtAccessToken.mockReturnValue(
        'access-cookie',
      );
      mockAuthenticationService.getCookieWithJwtRefreshToken.mockReturnValue({
        cookie: 'refresh-cookie',
        token: 'refresh-token',
      });

      const result = await controller.logIn(request as any);

      expect(result).toEqual(user);
      expect(request.res.setHeader).toHaveBeenCalledWith('Set-Cookie', [
        'access-cookie',
        'refresh-cookie',
      ]);
    });
  });

  describe('logOut', () => {
    it('should logout a user and clear cookies', async () => {
      const mockRequest = {
        user: { id: 1 },
        res: {
          setHeader: jest.fn(),
        },
      };

      jest
        .spyOn(usersService, 'removeRefreshToken')
        .mockResolvedValue(undefined);
      jest
        .spyOn(authService, 'getCookiesForLogOut')
        .mockReturnValue([
          'Authentication=; HttpOnly; Path=/; Max-Age=0',
          'Refresh=; HttpOnly; Path=/; Max-Age=0',
        ]);

      await controller.logOut(mockRequest as any);

      expect(usersService.removeRefreshToken).toHaveBeenCalledWith(1);
      expect(mockRequest.res.setHeader).toHaveBeenCalledWith('Set-Cookie', [
        'Authentication=; HttpOnly; Path=/; Max-Age=0',
        'Refresh=; HttpOnly; Path=/; Max-Age=0',
      ]);
    });
  });

  describe('authenticate', () => {
    it('should return the authenticated user', () => {
      const user = {
        id: 1,
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
      };

      const mockRequest = {
        user,
      };

      const result = controller.authenticate(mockRequest as any);
      expect(result).toEqual(user);
    });
  });
});
