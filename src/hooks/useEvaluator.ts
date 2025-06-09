import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Task, Annotator, Evaluation } from '@/types/evaluation';
import { toast } from 'sonner';
import { User, PostgrestError } from '@supabase/supabase-js';

type EvaluatorState = {
  status: 'initializing' | 'loading_tasks' | 'needs_survey' | 'evaluating' | 'complete' | 'error';
  allTasks: Task[];
  assignedTasks: Task[];
  annotator: Annotator | null;
  completedEvaluations: Evaluation[];
  currentTask: Task | null;
  progress: { current: number; total: number };
  error: string | null;
  user: User | null;
};

export const useEvaluator = () => {
  const { user } = useAuth();
  const [state, setState] = useState<EvaluatorState>({
    status: 'initializing',
    allTasks: [],
    assignedTasks: [],
    annotator: null,
    completedEvaluations: [],
    currentTask: null,
    progress: { current: 0, total: 0 },
    error: null,
    user: null,
  });

  const handleError = useCallback((message: string, error?: any) => {
    console.error(message, error);
    toast.error(message);
    setState(prev => ({ ...prev, status: 'error', error: message }));
  }, []);

  const getNextBlockNumber = async (): Promise<number> => {
    // This function should be executed with service_role privileges
    // if you have RLS policies that restrict selecting other annotators.
    // Consider creating a Supabase Edge Function for this.
    // For now, we assume the user can read the `annotators` table.
    const { data, error } = await (supabase as any)
      .from('annotators')
      .select('block_number')
      .not('block_number', 'is', null)
      .order('block_number', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') { // Ignore "not found"
      handleError('Could not determine next task block.', error);
      throw new Error('Could not determine next task block.');
    }

    return (data?.block_number ?? -1) + 1;
  };

  const loadTasks = useCallback(async () => {
    setState(prev => ({ ...prev, status: 'loading_tasks' }));
    try {
      const response = await fetch('/tasks.json');
      if (!response.ok) throw new Error('Failed to fetch tasks.json');
      const tasksData: Task[] = await response.json();
      setState(prev => ({ ...prev, allTasks: tasksData }));
      return tasksData;
    } catch (error) {
      handleError('Failed to load evaluation tasks.', error);
      return [];
    }
  }, [handleError]);

  const getOrCreateAnnotator = useCallback(async (user: User): Promise<Annotator | null> => {
    try {
      // First, check if the user's annotator profile exists.
      // The `handle_new_user` trigger in Supabase should create this on sign-up.
      let { data: annotator, error: fetchError } = await (supabase as any)
        .from('annotators')
        .select('*')
        .eq('id', user.id)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }
      
      // If annotator doesn't exist, create it as a fallback.
      // This requires an RLS policy allowing users to insert their own record.
      if (!annotator) {
        console.warn('Annotator record not found. Attempting to create from client...');
        const { data: newAnnotator, error: insertError } = await (supabase as any)
          .from('annotators')
          .insert({ id: user.id, email: user.email })
          .select()
          .single();
        
        if (insertError) {
          handleError('Could not create your user profile. Please contact support.', insertError);
          return null;
        }
        annotator = newAnnotator;
        console.log('Successfully created annotator profile.');
      }

      // If the annotator doesn't have a block number, assign one.
      if (annotator && annotator.block_number === null) {
        console.log(`Annotator ${user.email} needs a task block. Assigning one...`);
        const nextBlock = await getNextBlockNumber();
        
        const { data: updatedAnnotator, error: updateError } = await (supabase as any)
          .from('annotators')
          .update({ block_number: nextBlock })
          .eq('id', user.id)
          .select()
          .single();

        if (updateError) {
          handleError('Failed to assign a task block. Please try again.', updateError);
          return null; // or return the annotator without a block
        }

        console.log(`Assigned block ${nextBlock} to ${user.email}.`);
        return updatedAnnotator as Annotator;
      }

      return annotator as Annotator;

    } catch (error) {
      handleError('There was an issue accessing your user profile.', error);
      return null;
    }
  }, [handleError]);

  const loadUserAndProgress = useCallback(async (user: User, allTasks: Task[]) => {
    const annotatorProfile = await getOrCreateAnnotator(user);
    if (!annotatorProfile) return;

    // New: Determine the task slice for this annotator
    const blockNumber = annotatorProfile.block_number;
    const blockSize = 20;
    
    if (blockNumber === null) {
      handleError('Could not determine your assigned tasks. The block number is missing.');
      return;
    }

    const startIndex = blockNumber * blockSize;
    const endIndex = startIndex + blockSize;
    const assignedTasks = allTasks.slice(startIndex, endIndex);

    if (assignedTasks.length === 0) {
      // This can happen if the block number is too high for the number of tasks
      console.warn(`No tasks found for block ${blockNumber}. The user might have completed all available tasks or the block is out of bounds.`);
      setState(prev => ({ ...prev, status: 'complete', annotator: annotatorProfile, user }));
      return;
    }

    if (!annotatorProfile.expertise_group) {
      setState(prev => ({ ...prev, status: 'needs_survey', annotator: annotatorProfile, user, assignedTasks }));
      return;
    }

    try {
      const { data: evaluations, error } = await supabase
        .from('evaluations')
        .select('*')
        .eq('annotator_id', annotatorProfile.id);

      if (error) throw error;

      const completedIds = new Set(evaluations.map(e => e.task_id));
      const nextTask = assignedTasks.find(t => !completedIds.has(t.taskId)) || null;

      setState(prev => ({
        ...prev,
        assignedTasks: assignedTasks,
        annotator: annotatorProfile,
        completedEvaluations: evaluations || [],
        status: nextTask ? 'evaluating' : 'complete',
        currentTask: nextTask,
        progress: { current: completedIds.size, total: assignedTasks.length },
        user,
      }));
    } catch (error) {
      handleError('Failed to load your evaluation progress.', error);
    }
  }, [getOrCreateAnnotator, handleError]);
  
  // Main effect to drive the logic
  useEffect(() => {
    if (user) {
      loadTasks().then(allTasks => {
        if (allTasks.length > 0) {
          loadUserAndProgress(user, allTasks);
        }
      });
    } else {
      setState(prev => ({ ...prev, status: 'initializing' }));
    }
  }, [user, loadTasks, loadUserAndProgress]);

  const submitEvaluation = async (scores: { scoreA: number; scoreB: number }) => {
    if (!state.annotator || !state.currentTask || state.status !== 'evaluating') return;

    try {
      const newEvaluation: Omit<Evaluation, 'id' | 'created_at'> = {
        annotator_id: state.annotator.id,
        task_id: state.currentTask.taskId,
        score_a: scores.scoreA,
        score_b: scores.scoreB,
        session_start_time: new Date().toISOString(), // This could be managed better
        evaluation_end_time: new Date().toISOString(),
      };
      
      const { data, error } = await supabase
        .from('evaluations')
        .insert(newEvaluation)
        .select()
        .single();
      
      if (error) throw error;
      
      toast.success('Progress saved!');

      // Manually update state to reflect the new submission
      setState(prev => {
        const updatedEvaluations = [...prev.completedEvaluations, data];
        const completedIds = new Set(updatedEvaluations.map(e => e.task_id));
        const nextTask = prev.assignedTasks.find(t => !completedIds.has(t.taskId)) || null;
        
        return {
          ...prev,
          completedEvaluations: updatedEvaluations,
          currentTask: nextTask,
          status: nextTask ? 'evaluating' : 'complete',
          progress: { current: completedIds.size, total: prev.assignedTasks.length },
        };
      });

    } catch (error) {
      handleError('Failed to save your evaluation.', error);
    }
  };

  const submitBackgroundSurvey = async (expertise: 'medical' | 'general') => {
    if (!state.annotator) return;

    try {
      const { data, error } = await supabase
        .from('annotators')
        .update({ expertise_group: expertise })
        .eq('id', state.annotator.id)
        .select()
        .single();

      if (error) throw error;

      toast.success('Thank you! Your profile is updated.');
      
      // Reload progress
      if (user) {
        loadUserAndProgress(user, state.allTasks);
      }

    } catch (error) {
      handleError('Failed to save your background information.', error);
    }
  };

  return { ...state, submitEvaluation, submitBackgroundSurvey };
}; 