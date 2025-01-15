export interface ClassMarkersSearchBody {
  id: number;
  questionType: string;
  randomAnswer: string;
  correctFeedback: string;
  incorrectFeedback: string;
  point: number;
  question: string;
  correct: string;
  answerA: string;
  answerB: string;
  answerC: string;
  answerD: string;
  answerE: string;
  answerF: string;
  answerG: string;
  answerH: string;
  answerI: string;
  answerJ: string;
  createdAt: string;
  updatedAt: string;
}

export interface ClassMarkersSearchResult {
  hits: {
    total: number;
    hits: Array<{
      _source: ClassMarkersSearchBody;
    }>;
  };
}
