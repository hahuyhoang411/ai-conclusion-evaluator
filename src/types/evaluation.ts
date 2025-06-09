export interface Task {
  taskId: number;
  metaAnalysisName: string;
  sourceAbstracts: string[];
  referenceConclusion: string;
  modelOutputs: {
    conclusionA: string;
    conclusionB: string;
  };
}

export interface Annotator {
  id: string;
  email: string | null;
  expertise_group: string | null;
  created_at: string;
  block_number: number | null;
}

/* 
  SQL to add the block_number column to your Supabase table:

  ALTER TABLE public.annotators
  ADD COLUMN block_number INTEGER;

  -- Optional: Create an index for faster lookups
  CREATE INDEX idx_annotators_block_number ON public.annotators(block_number);
*/

export interface Evaluation {
  id: number;
  annotator_id: string;
  task_id: number | null;
  score_a: number | null;
  score_b: number | null;
  session_start_time: string | null;
  evaluation_end_time: string | null;
  created_at: string;
}
