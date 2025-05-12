export interface QuestionDistributionOptions {
  allowAutoAdjust?: boolean;
  maxQuestionPercentage?: number; // Ví dụ: 0.8 = 80%
}

// types.ts
export interface QuestionDistributionOptions {
  allowAutoAdjust?: boolean;
  maxQuestionPercentage?: number;
}

export interface QuestionDistributionResult {
  success: boolean;
  stats: {
    totalQuestions: number;
    distributedQuestions: number;
    questionsPerSet: number[];
  };
}

// constants.ts
export const DISTRIBUTION_CONSTANTS = {
  MIN_QUESTIONS_PER_SET: 100,
  DEFAULT_MAX_PERCENTAGE: 0.8,
  BATCH_SIZE: 1000,
} as const;
