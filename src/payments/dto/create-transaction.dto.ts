export class CreateTransactionDto {
  gateway: string;
  transactionDate: string;
  accountNumber?: string;
  subAccount?: string;

  transferType: 'in' | 'out';
  transferAmount: number;
  accumulated: number;

  code?: string;
  content?: string;
  referenceCode?: string;
  description?: string;
}
