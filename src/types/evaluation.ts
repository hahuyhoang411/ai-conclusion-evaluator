export interface DetailedScore {
  ref_sentence_index: number;
  conclusion_fragment: string | null;
  score: number;
  explanation: string;
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
  detailedScoring?: {
    modelA: DetailedScore[];
    modelB: DetailedScore[];
  };
  isTraining: boolean;
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
