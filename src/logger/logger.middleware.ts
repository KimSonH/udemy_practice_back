import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  private _logger = new Logger(LoggerMiddleware.name);
  use(req: Request, res: Response, next: NextFunction) {
    const { method, originalUrl, ip, hostname, params, body, query } = req;
    const start = Date.now();
    const duration = Date.now() - start + 'ms';
    const json = JSON.stringify({
      method,
      originalUrl,
      ip,
      hostname,
      params,
      body,
      query,
      duration,
    }).toString();
    this._logger.log(json);

    next();
  }
}
