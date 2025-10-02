import { BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';

export const WithTransaction = () => {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const dataSource = this.coursesRepository.manager.connection;
      const queryRunner = dataSource.createQueryRunner();

      await queryRunner.connect();
      await queryRunner.startTransaction();

      try {
        const result = await originalMethod.apply(this, [...args, queryRunner]);
        await queryRunner.commitTransaction();
        return result;
      } catch (error) {
        await queryRunner.rollbackTransaction();
        throw new BadRequestException(
          `Error in ${propertyKey}: ${error.message}`,
        );
      } finally {
        await queryRunner.release();
      }
    };

    return descriptor;
  };
};
