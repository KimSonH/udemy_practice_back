import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';
import { TestAttemptsService } from './test-attempts/test-attempts.service';

/**
 * Retention housekeeping, run from the system's scheduler:
 *
 *   npm run prune:attempts
 *
 * A standalone context rather than a timer inside the API. Deploys run
 * several PM2 instances, and an in-process schedule would fire this once per
 * instance against the same rows.
 */
async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  try {
    const { detailsCleared, abandonedRemoved } = await app
      .get(TestAttemptsService)
      .prune();

    console.log(
      `Pruned test attempts: answers cleared on ${detailsCleared}, ` +
        `abandoned removed ${abandonedRemoved}`,
    );
  } finally {
    await app.close();
  }
}

main().catch((error) => {
  console.error('Pruning failed', error);
  // A non-zero exit so a scheduler notices, rather than a silent success
  // that leaves the table growing unwatched.
  process.exit(1);
});
