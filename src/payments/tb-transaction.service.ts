import { InjectRepository } from '@nestjs/typeorm';
import { TBTransaction } from './entities/tb-transaction.entity';
import { Repository } from 'typeorm';
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { CreateTransactionDto } from './dto/create-transaction.dto';

@Injectable()
export class TBTransactionService {
  private readonly logger = new Logger(TBTransactionService.name);

  constructor(
    @InjectRepository(TBTransaction)
    private readonly tbTransactionRepository: Repository<TBTransaction>,
  ) {}

  async createFromWebhook(data: CreateTransactionDto) {
    if (!data) {
      throw new BadRequestException('No data received');
    }

    const {
      gateway,
      transactionDate,
      accountNumber,
      subAccount,
      transferType,
      transferAmount,
      accumulated,
      code,
      content,
      referenceCode,
      description,
    } = data;

    let amount_in = 0;
    let amount_out = 0;

    if (transferType === 'in') {
      amount_in = transferAmount;
    } else if (transferType === 'out') {
      amount_out = transferAmount;
    }

    const transaction = this.tbTransactionRepository.create({
      gateway,
      transaction_date: new Date(transactionDate),
      account_number: accountNumber,
      sub_account: subAccount,
      amount_in,
      amount_out,
      accumulated,
      code,
      transaction_content: content,
      reference_number: referenceCode,
      body: description,
    });

    try {
      await this.tbTransactionRepository.save(transaction);
      return { success: true };
    } catch (error) {
      this.logger.error(error);
      throw new BadRequestException(
        'Cannot insert record to MySQL: ' + error.message,
      );
    }
  }
}
