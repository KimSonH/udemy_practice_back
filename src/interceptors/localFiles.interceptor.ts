import { FileInterceptor } from '@nestjs/platform-express';
import { Injectable, mixin, NestInterceptor, Type } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import { diskStorage } from 'multer';

interface LocalFilesInterceptorOptions {
  fieldName: string;
  path?: string;
  fileFilter?: MulterOptions['fileFilter'];
  limits?: MulterOptions['limits'];
  filename?: MulterOptions['storage']['filename'];
}

function LocalFilesInterceptor(
  options: LocalFilesInterceptorOptions,
): Type<NestInterceptor> {
  @Injectable()
  class Interceptor implements NestInterceptor {
    fileInterceptor: NestInterceptor;
    constructor(configService: ConfigService) {
      const filesDestination = configService.get('UPLOADED_FILES_DESTINATION');

      const destination = `${filesDestination}${options.path}`;

      const multerOptions: MulterOptions = {
        storage: diskStorage({
          destination,
          filename:
            options.filename ||
            ((req, file, callback) => {
              const uniqueSuffix =
                Date.now() + '-' + Math.round(Math.random() * 1e9);
              const extension = file.mimetype.split('/')[1];
              let finalExtension = '';

              switch (extension.toLowerCase()) {
                case 'jpeg':
                case 'jpg':
                  finalExtension = 'jpeg';
                  break;
                case 'png':
                  finalExtension = 'png';
                  break;
                case 'gif':
                  finalExtension = 'gif';
                  break;
                case 'webp':
                  finalExtension = 'webp';
                  break;
                case 'svg+xml':
                  finalExtension = 'svg';
                  break;
                case 'bmp':
                  finalExtension = 'bmp';
                  break;
                case 'tiff':
                  finalExtension = 'tiff';
                  break;
                case 'x-icon':
                case 'vnd.microsoft.icon':
                  finalExtension = 'ico';
                  break;
                case 'heic':
                case 'heif':
                  finalExtension = 'heic';
                  break;
                default:
                  finalExtension = 'jpeg'; // fallback to jpeg
              }

              callback(null, `${uniqueSuffix}.${finalExtension}`);
            }),
        }),
        fileFilter: options.fileFilter,
        limits: options.limits,
      };

      this.fileInterceptor = new (FileInterceptor(
        options.fieldName,
        multerOptions,
      ))();
    }

    intercept(...args: Parameters<NestInterceptor['intercept']>) {
      return this.fileInterceptor.intercept(...args);
    }
  }
  return mixin(Interceptor);
}

export default LocalFilesInterceptor;
