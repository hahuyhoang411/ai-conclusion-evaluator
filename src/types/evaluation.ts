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
  detailedComparisons?: SentenceComparison[];
  isTraining: boolean;
  // Legacy support for old format
  metaAnalysisName?: string;
}

export interface SentenceComparison {
  ref_sentence_index: number;
  conclusionA: SubComparison;
  conclusionB: SubComparison;
}

export interface SubComparison {
  conclusion_fragment: string;
  score: number;
  explanation: string;
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
