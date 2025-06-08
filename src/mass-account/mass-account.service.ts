import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { GetMassAccountDto } from './dto/createMassAccount';

@Injectable()
export class MassAccountsService {
  constructor(private readonly httpService: HttpService) {}

  async getMassAccounts(query: GetMassAccountDto) {
    const { page = '1', limit = '10', search = '' } = query;
    const url = `http://localhost:3304/api/account-service/mass-account?page=${page}&limit=${limit}&search=${search}`;

    const response = await firstValueFrom(
      this.httpService.get(url, {
        headers: {
          'Content-Type': 'application/json',
          'x-Private-key': 'Diligent123',
        },
      }),
    );
    return response.data;
  }
}
