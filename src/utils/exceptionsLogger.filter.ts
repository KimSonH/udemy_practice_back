import { Catch, ArgumentsHost, Logger } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';

@Catch()
export class ExceptionsLoggerFilter extends BaseExceptionFilter {
  private _logger = new Logger(ExceptionsLoggerFilter.name);
  catch(exception: unknown, host: ArgumentsHost) {
    this._logger.error(exception);
    super.catch(exception, host);
  }
}
