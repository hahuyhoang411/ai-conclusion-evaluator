import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Task, Annotator, Evaluation, TasksData } from '@/types/evaluation';
import { toast } from 'sonner';
import { User, PostgrestError } from '@supabase/supabase-js';

type EvaluatorState = {
  status: 'initializing' | 'loading_tasks' | 'needs_survey' | 'training' | 'evaluating' | 'complete' | 'error';
  allTrainingTasks: Task[];
  allEvaluationTasks: Task[];
  assignedTasks: Task[];
  annotator: Annotator | null;
  completedEvaluations: Evaluation[];
  currentTask: Task | null;
  progress: { current: number; total: number };
  trainingProgress: { current: number; total: number };
  isInTrainingMode: boolean;
  error: string | null;
  user: User | null;
  // Local training progress (not stored in database)
  completedTrainingTaskIds: Set<string>;
};

export const useEvaluator = () => {
  const { user } = useAuth();
  const [state, setState] = useState<EvaluatorState>({
    status: 'initializing',
    allTrainingTasks: [],
    allEvaluationTasks: [],
    assignedTasks: [],
    annotator: null,
    completedEvaluations: [],
    currentTask: null,
    progress: { current: 0, total: 0 },
    trainingProgress: { current: 0, total: 0 },
    isInTrainingMode: false,
    error: null,
    user: null,
    completedTrainingTaskIds: new Set(),
  });

  const handleError = useCallback((message: string, error?: any) => {
    console.error(message, error);
    toast.error(message);
    setState(prev => ({ ...prev, status: 'error', error: message }));
  }, []);

  const getNextBlockNumber = async (): Promise<number> => {
    console.log('Requesting next block number from edge function...');
    
    const { data, error } = await supabase.functions.invoke('get-next-block');

    if (error) {
      console.error('Error calling get-next-block function:', error);
      handleError('Could not determine next task block.', error);
      throw new Error('Could not determine next task block.');
    }

    console.log('Block assignment response:', data);
    
    if (data.error) {
      console.error('Block assignment error:', data.error);
      handleError(data.error);
      throw new Error(data.error);
    }

    const { nextBlockNumber, isReassignment, totalIncompleteBlocks } = data;
    
    if (isReassignment) {
      console.log(`🔄 Reassigning incomplete block ${nextBlockNumber} (${totalIncompleteBlocks} incomplete blocks remaining)`);
      toast.info(`You've been assigned block ${nextBlockNumber} (previously incomplete)`);
    } else {
      console.log(`✨ Assigning new block ${nextBlockNumber}`);
      toast.success(`You've been assigned block ${nextBlockNumber}`);
    }

    return nextBlockNumber;
  };

  const loadTasks = useCallback(async () => {
    setState(prev => ({ ...prev, status: 'loading_tasks' }));
    try {
      const response = await fetch('/tasks.json');
      if (!response.ok) throw new Error('Failed to fetch tasks.json');
      const tasksData = await response.json();
      
      console.log('Raw tasks data:', tasksData);
      
      // Handle both old and new format
      let trainingTasks: Task[] = [];
      let evaluationTasks: Task[] = [];
      
      if (Array.isArray(tasksData)) {
        // Old format - treat all as evaluation tasks
        evaluationTasks = tasksData.map(task => ({ ...task, isTraining: false }));
      } else if (tasksData.trainingTasks && tasksData.evaluationTasks) {
        // New format
        trainingTasks = tasksData.trainingTasks.map(task => ({ ...task, isTraining: true }));
        evaluationTasks = tasksData.evaluationTasks.map(task => ({ ...task, isTraining: false }));
      }
      
      console.log('Parsed training tasks:', trainingTasks.length, trainingTasks);
      console.log('Parsed evaluation tasks:', evaluationTasks.length, evaluationTasks);
      
      setState(prev => ({ 
        ...prev, 
        allTrainingTasks: trainingTasks,
        allEvaluationTasks: evaluationTasks 
      }));
      
      return { trainingTasks, evaluationTasks };
    } catch (error) {
      handleError('Failed to load evaluation tasks.', error);
      return { trainingTasks: [], evaluationTasks: [] };
    }
  }, [handleError]);

  const getOrCreateAnnotator = useCallback(async (user: User): Promise<Annotator | null> => {
    try {
      console.log('Checking annotator profile for user:', user.email);
      
      let { data: annotator, error: fetchError } = await supabase
        .from('annotators')
        .select('*')
        .eq('email', user.email)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        console.log('Error fetching annotator:', fetchError);
        throw fetchError;
      }
      
      if (!annotator) {
        console.log('No annotator found, creating new one...');
        const { data: newAnnotator, error: insertError } = await supabase
          .from('annotators')
          .insert({ 
            id: user.id, 
            email: user.email 
          })
          .select()
          .single();
        
        if (insertError) {
          console.log('Error creating annotator:', insertError);
          handleError('Could not create your user profile. Please contact support.', insertError);
          return null;
        }
        annotator = newAnnotator;
        console.log('Successfully created annotator profile.');
      }

      if (annotator && annotator.block_number === null) {
        console.log(`Annotator ${user.email} needs a task block. Requesting assignment...`);
        
        try {
          const nextBlock = await getNextBlockNumber();
          
          const { data: updatedAnnotator, error: updateError } = await supabase
            .from('annotators')
            .update({ block_number: nextBlock })
            .eq('id', user.id)
            .select()
            .single();

          if (updateError) {
            console.error('Failed to update annotator with block number:', updateError);
            handleError('Failed to assign a task block. Please try again.', updateError);
            return annotator;
          }

          console.log(`✅ Successfully assigned block ${nextBlock} to ${user.email}`);
          return updatedAnnotator as Annotator;
        } catch (blockError) {
          console.error('Block assignment failed:', blockError);
          // Return the annotator without block assignment so they can try again
          return annotator;
        }
      }

      // Log current block assignment
      if (annotator.block_number !== null) {
        console.log(`User ${user.email} is already assigned to block ${annotator.block_number}`);
      }

      return annotator as Annotator;

    } catch (error) {
      handleError('There was an issue accessing your user profile.', error);
      return null;
    }
  }, [handleError, getNextBlockNumber]);

  const loadUserAndProgress = useCallback(async (user: User, trainingTasks: Task[], evaluationTasks: Task[]) => {
    console.log('Loading user progress with:', {
      trainingTasksCount: trainingTasks.length,
      evaluationTasksCount: evaluationTasks.length
    });

    const annotatorProfile = await getOrCreateAnnotator(user);
    if (!annotatorProfile) return;

    const blockNumber = annotatorProfile.block_number;
    const blockSize = 20;
    
    if (blockNumber === null) {
      handleError('Could not determine your assigned tasks. The block number is missing.');
      return;
    }

    const startIndex = blockNumber * blockSize;
    const endIndex = startIndex + blockSize;
    const assignedEvaluationTasks = evaluationTasks.slice(startIndex, endIndex);

    if (assignedEvaluationTasks.length === 0) {
      console.warn(`No evaluation tasks found for block ${blockNumber}.`);
      setState(prev => ({ ...prev, status: 'complete', annotator: annotatorProfile, user }));
      return;
    }

    if (!annotatorProfile.expertise_group) {
      setState(prev => ({ 
        ...prev, 
        status: 'needs_survey', 
        annotator: annotatorProfile, 
        user, 
        assignedTasks: assignedEvaluationTasks,
        allTrainingTasks: trainingTasks,
        allEvaluationTasks: evaluationTasks
      }));
      return;
    }

    try {
      const { data: evaluations, error } = await supabase
        .from('evaluations')
        .select('*')
        .eq('annotator_id', annotatorProfile.id);

      if (error) throw error;

      console.log('All evaluations for user:', evaluations);

      const mainEvaluations = evaluations?.filter(e => 
        assignedEvaluationTasks.some(t => t.taskId.toString() === e.task_id?.toString())
      ) || [];

      console.log('Main evaluations found:', mainEvaluations.length);

      // Check if user needs to complete training - FORCE training if we have training tasks
      const shouldDoTraining = trainingTasks.length > 0;
      
      console.log('Should do training?', shouldDoTraining, {
        trainingTasksLength: trainingTasks.length
      });
      
      if (shouldDoTraining) {
        const nextTrainingTask = trainingTasks[0] || null;
        
        console.log('Setting up training mode, next task:', nextTrainingTask);
        
        setState(prev => ({
          ...prev,
          allTrainingTasks: trainingTasks,
          allEvaluationTasks: evaluationTasks,
          assignedTasks: assignedEvaluationTasks,
          annotator: annotatorProfile,
          completedEvaluations: evaluations || [],
          status: 'training',
          currentTask: nextTrainingTask,
          isInTrainingMode: true,
          trainingProgress: { current: 0, total: trainingTasks.length },
          progress: { current: mainEvaluations.length, total: assignedEvaluationTasks.length },
          user,
          completedTrainingTaskIds: new Set(),
        }));
      } else {
        // Proceed to main evaluation
        const completedIds = new Set(mainEvaluations.map(e => e.task_id?.toString()));
        const nextTask = assignedEvaluationTasks.find(t => !completedIds.has(t.taskId.toString())) || null;

        console.log('Setting up evaluation mode, next task:', nextTask);

        setState(prev => ({
          ...prev,
          allTrainingTasks: trainingTasks,
          allEvaluationTasks: evaluationTasks,
          assignedTasks: assignedEvaluationTasks,
          annotator: annotatorProfile,
          completedEvaluations: evaluations || [],
          status: nextTask ? 'evaluating' : 'complete',
          currentTask: nextTask,
          isInTrainingMode: false,
          trainingProgress: { current: 0, total: trainingTasks.length },
          progress: { current: mainEvaluations.length, total: assignedEvaluationTasks.length },
          user,
        }));
      }
    } catch (error) {
      handleError('Failed to load your evaluation progress.', error);
    }
  }, [getOrCreateAnnotator, handleError]);
  
  useEffect(() => {
    if (user) {
      loadTasks().then(({ trainingTasks, evaluationTasks }) => {
        if (evaluationTasks.length > 0 || trainingTasks.length > 0) {
          loadUserAndProgress(user, trainingTasks, evaluationTasks);
        }
      });
    } else {
      setState(prev => ({ ...prev, status: 'initializing' }));
    }
  }, [user, loadTasks, loadUserAndProgress]);

  const submitEvaluation = async (scores: { scoreA: number; scoreB: number }) => {
    if (!state.annotator || !state.currentTask) return;

    if (state.isInTrainingMode) {
      // Handle training progression locally (no database storage)
      const currentTaskId = state.currentTask.taskId.toString();
      const newCompletedTrainingIds = new Set(state.completedTrainingTaskIds);
      newCompletedTrainingIds.add(currentTaskId);
      
      const nextTrainingTask = state.allTrainingTasks.find(t => 
        !newCompletedTrainingIds.has(t.taskId.toString())
      ) || null;
      
      if (nextTrainingTask) {
        // Continue with training
        setState(prev => ({
          ...prev,
          completedTrainingTaskIds: newCompletedTrainingIds,
          currentTask: nextTrainingTask,
          trainingProgress: { 
            current: newCompletedTrainingIds.size, 
            total: prev.allTrainingTasks.length 
          },
        }));
        toast.success('Training progress saved!');
      } else {
        // Training complete, move to main evaluation
        const mainEvaluations = state.completedEvaluations.filter(e => 
          state.assignedTasks.some(t => t.taskId.toString() === e.task_id?.toString())
        );
        const completedMainIds = new Set(mainEvaluations.map(e => e.task_id?.toString()));
        const nextMainTask = state.assignedTasks.find(t => !completedMainIds.has(t.taskId.toString())) || null;
        
        setState(prev => ({
          ...prev,
          completedTrainingTaskIds: newCompletedTrainingIds,
          currentTask: nextMainTask,
          status: nextMainTask ? 'evaluating' : 'complete',
          isInTrainingMode: false,
          trainingProgress: { current: newCompletedTrainingIds.size, total: prev.allTrainingTasks.length },
        }));
        toast.success('Training completed! Starting evaluation tasks.');
      }
      return;
    }

    // Handle main evaluation (store in database)
    try {
      const taskIdAsNumber = typeof state.currentTask.taskId === 'string' 
        ? parseInt(state.currentTask.taskId, 10) 
        : state.currentTask.taskId;

      const newEvaluation = {
        annotator_id: state.annotator.id,
        task_id: taskIdAsNumber,
        score_a: scores.scoreA,
        score_b: scores.scoreB,
        session_start_time: new Date().toISOString(),
        evaluation_end_time: new Date().toISOString(),
      };
      
      const { data, error } = await supabase
        .from('evaluations')
        .insert(newEvaluation)
        .select()
        .single();
      
      if (error) throw error;
      
      toast.success('Progress saved!');

      setState(prev => {
        const updatedEvaluations = [...prev.completedEvaluations, data];
        const mainEvaluations = updatedEvaluations.filter(e => 
          prev.assignedTasks.some(t => t.taskId.toString() === e.task_id?.toString())
        );
        const completedIds = new Set(mainEvaluations.map(e => e.task_id?.toString()));
        const nextTask = prev.assignedTasks.find(t => !completedIds.has(t.taskId.toString())) || null;
        
        return {
          ...prev,
          completedEvaluations: updatedEvaluations,
          currentTask: nextTask,
          status: nextTask ? 'evaluating' : 'complete',
          progress: { current: mainEvaluations.length, total: prev.assignedTasks.length },
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
      
      if (user) {
        loadUserAndProgress(user, state.allTrainingTasks, state.allEvaluationTasks);
      }

    } catch (error) {
      handleError('Failed to save your background information.', error);
    }
  };

  return { ...state, submitEvaluation, submitBackgroundSurvey };
};
