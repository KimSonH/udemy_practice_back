import { AuthenticationService } from '../authentication.service';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../../users/users.service';
import * as bcrypt from 'bcrypt';

const mockUsersService = {
  getByEmail: jest.fn(),
  create: jest.fn(),
  getById: jest.fn(),
};

const mockJwtService = {
  sign: jest.fn(),
};

const mockConfigService = {
  get: jest.fn(),
};

describe('AuthenticationService', () => {
  let service: AuthenticationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthenticationService,
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<AuthenticationService>(AuthenticationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    it('should hash password and create user', async () => {
      const registerDto = {
        email: 'test@test.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
      };

      const hashedPassword = 'hashedPassword';
      const expectedUser = {
        ...registerDto,
        password: hashedPassword,
        id: 1,
      };

      jest
        .spyOn(bcrypt, 'hash')
        .mockImplementation(() => Promise.resolve(hashedPassword));

      mockUsersService.create.mockResolvedValue(expectedUser);

      const result = await service.register(registerDto);

      expect(bcrypt.hash).toHaveBeenCalledWith(registerDto.password, 10);
      expect(mockUsersService.create).toHaveBeenCalledWith({
        ...registerDto,
        password: hashedPassword,
      });
      expect(result).toEqual(expectedUser);
    });
  });

  describe('getCookieWithJwtAccessToken', () => {
    it('should return a string', () => {
      const userId = 1;
      mockJwtService.sign.mockReturnValue('signed-token');
      mockConfigService.get.mockReturnValue('3600');

      const result = service.getCookieWithJwtAccessToken(userId);

      expect(typeof result).toBe('string');
      expect(result).toContain('Authentication=signed-token');
    });
  });
});
