import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Task, Annotator, Evaluation } from '@/types/evaluation';
import { toast } from 'sonner';
import { User, PostgrestError } from '@supabase/supabase-js';

type EvaluatorState = {
  status: 'initializing' | 'loading_tasks' | 'needs_survey' | 'evaluating' | 'complete' | 'error';
  tasks: Task[];
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
    tasks: [],
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

  const loadTasks = useCallback(async () => {
    setState(prev => ({ ...prev, status: 'loading_tasks' }));
    try {
      const response = await fetch('/tasks.json');
      if (!response.ok) throw new Error('Failed to fetch tasks.json');
      const tasksData: Task[] = await response.json();
      setState(prev => ({ ...prev, tasks: tasksData }));
      return tasksData;
    } catch (error) {
      handleError('Failed to load evaluation tasks.', error);
      return [];
    }
  }, [handleError]);

  const getOrCreateAnnotator = useCallback(async (user: User, attempt = 1): Promise<Annotator | null> => {
    // The `handle_new_user` trigger in Supabase should create an annotator record automatically.
    // We poll briefly to give the trigger time to complete.
    try {
      const { data, error } = await (supabase as any)
        .from('annotators')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error; // Throw if it's not a "not found" error

      if (data) {
        return data as Annotator;
      }
      
      // If not found, wait and retry once.
      if (attempt <= 2) {
        console.log(`Annotator for ${user.email} not found, retrying... (Attempt ${attempt})`)
        await new Promise(resolve => setTimeout(resolve, 1000));
        return getOrCreateAnnotator(user, attempt + 1);
      }

      // If it still doesn't exist, the trigger likely failed.
      // The most common reason is that the `annotators` table is missing a `id` column
      // of type `uuid` that is linked to `auth.users.id`.
      // We will attempt to create it from the client as a fallback.
      // NOTE: This requires an RLS policy that allows users to insert their own annotator record.
      console.warn('Annotator record not found, and trigger may have failed. Attempting to create from client...');
      const { data: newAnnotator, error: insertError } = await (supabase as any)
        .from('annotators')
        .insert({ id: user.id, email: user.email })
        .select()
        .single();
      
      if (insertError) {
        handleError('Could not create your user profile. Please contact support.', insertError);
        // This is a critical failure, RLS is likely misconfigured.
        // The policy should be: CREATE POLICY "Users can create their own annotator profile"
        // ON public.annotators FOR INSERT WITH CHECK (auth.uid() = id);
        return null;
      }
      
      console.log('Successfully created annotator profile from client fallback.');
      return newAnnotator as Annotator;

    } catch (error) {
      handleError('There was an issue accessing your user profile.', error);
      return null;
    }
  }, [handleError]);

  const loadUserAndProgress = useCallback(async (user: User, tasks: Task[]) => {
    const annotatorProfile = await getOrCreateAnnotator(user);
    if (!annotatorProfile) return;

    if (!annotatorProfile.expertise_group) {
      setState(prev => ({ ...prev, status: 'needs_survey', annotator: annotatorProfile, user }));
      return;
    }

    try {
      const { data: evaluations, error } = await supabase
        .from('evaluations')
        .select('*')
        .eq('annotator_id', annotatorProfile.id);

      if (error) throw error;

      const completedIds = new Set(evaluations.map(e => e.task_id));
      const nextTask = tasks.find(t => !completedIds.has(t.taskId)) || null;

      setState(prev => ({
        ...prev,
        annotator: annotatorProfile,
        completedEvaluations: evaluations || [],
        status: nextTask ? 'evaluating' : 'complete',
        currentTask: nextTask,
        progress: { current: completedIds.size, total: tasks.length },
        user,
      }));
    } catch (error) {
      handleError('Failed to load your evaluation progress.', error);
    }
  }, [getOrCreateAnnotator, handleError]);
  
  // Main effect to drive the logic
  useEffect(() => {
    if (user) {
      loadTasks().then(tasks => {
        if (tasks.length > 0) {
          loadUserAndProgress(user, tasks);
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
        const nextTask = prev.tasks.find(t => !completedIds.has(t.taskId)) || null;
        
        return {
          ...prev,
          completedEvaluations: updatedEvaluations,
          currentTask: nextTask,
          status: nextTask ? 'evaluating' : 'complete',
          progress: { current: completedIds.size, total: prev.tasks.length },
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
        loadUserAndProgress(user, state.tasks);
      }

    } catch (error) {
      handleError('Failed to save your background information.', error);
    }
  };

  return { ...state, submitEvaluation, submitBackgroundSurvey };
}; 