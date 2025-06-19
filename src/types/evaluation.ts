export interface PhraseMapping {
  phrase: string;
  score: number;
  explanation: string;
}

export interface SentenceMapping {
  referenceSentenceIndex: number;
  conclusionA?: PhraseMapping;
  conclusionB?: PhraseMapping;
}

export interface Task {
  taskId: number | string;
  sourcePaperId?: number;
  sourcePaperTitle?: string;
  sourceAbstracts: string[];
  referenceConclusion: string;
  modelOutputs: {
    conclusionA: string;
    conclusionB: string;
  };
  modelIdentities?: {
    modelA: string;
    modelB: string;
  };
  correctScores?: {
    modelA_score: number;
    modelB_score: number;
  };
  isTraining: boolean;
  // New field for granular sentence mappings in training tasks
  sentenceMappings?: SentenceMapping[];
  // Legacy support for old format
  metaAnalysisName?: string;
}

export interface TasksData {
  trainingTasks: Task[];
  evaluationTasks: Task[];
}

export interface Annotator {
  id: string;
  email: string | null;
  expertise_group: string | null;
  created_at: string;
  block_number: number | null;
}

export interface Evaluation {
  id: number;
  annotator_id: string;
  task_id: number | string | null;
  score_a: number | null;
  score_b: number | null;
  session_start_time: string | null;
  evaluation_end_time: string | null;
  created_at: string;
}
