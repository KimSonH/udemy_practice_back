import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { GetMassAccountDto } from './dto/createMassAccount';

@Injectable()
export class MassAccountsService {
  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  async getMassAccounts(query: GetMassAccountDto) {
    const { page = '1', limit = '12', search = '' } = query;
    const baseUrl = this.configService.get<string>('MASS_BASE_API_URL');
    const privateKey = this.configService.get<string>('MASS_PRIVATE_KEY');

    const url = `${baseUrl}/account-service/mass-account?page=${page}&limit=${limit}&search=${search}`;

    const response = await firstValueFrom(
      this.httpService.get(url, {
        headers: {
          'Content-Type': 'application/json',
          'x-Private-key': privateKey,
        },
      }),
    );
    return response.data;
  }
}
