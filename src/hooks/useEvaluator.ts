
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Task, Evaluation } from '@/types/evaluation';

interface Progress {
  current: number;
  total: number;
}

interface EvaluatorState {
  status: 'initializing' | 'loading_tasks' | 'training' | 'evaluating' | 'complete' | 'error';
  error: string | null;
  currentTask: Task | null;
  progress: Progress;
  trainingProgress: Progress;
  isInTrainingMode: boolean;
}

const SESSION_KEY = 'evaluator_session';

export const useEvaluator = () => {
  // Initialize state from sessionStorage to prevent reinitialization on tab changes
  const getInitialState = (): EvaluatorState => {
    try {
      const sessionData = sessionStorage.getItem(SESSION_KEY);
      if (sessionData) {
        return JSON.parse(sessionData);
      }
    } catch (error) {
      console.error('Error parsing session data:', error);
    }
    
    return {
      status: 'initializing',
      error: null,
      currentTask: null,
      progress: { current: 0, total: 0 },
      trainingProgress: { current: 0, total: 0 },
      isInTrainingMode: true
    };
  };

  const [state, setState] = useState<EvaluatorState>(getInitialState);
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [trainingTasks, setTrainingTasks] = useState<Task[]>([]);
  const [localTrainingIndex, setLocalTrainingIndex] = useState(0);
  const [isTrainingCompleted, setIsTrainingCompleted] = useState(false);
  const [evaluationTaskIndex, setEvaluationTaskIndex] = useState(0);

  // Save state to sessionStorage whenever it changes
  useEffect(() => {
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(state));
    } catch (error) {
      console.error('Error saving session data:', error);
    }
  }, [state]);

  const loadTasks = async () => {
    console.log('Loading tasks...');
    try {
      const response = await fetch('/tasks.json');
      if (!response.ok) {
        throw new Error(`Failed to fetch tasks: ${response.status}`);
      }
      const data = await response.json();
      console.log('Raw tasks data:', data);
      
      if (!data.tasks || !Array.isArray(data.tasks)) {
        throw new Error('Invalid tasks data structure');
      }
      
      const tasks = data.tasks as Task[];
      const training = tasks.filter(task => task.correctScores !== undefined);
      const evaluation = tasks.filter(task => task.correctScores === undefined);
      
      console.log(`Loaded ${tasks.length} total tasks: ${training.length} training, ${evaluation.length} evaluation`);
      
      setAllTasks(evaluation);
      setTrainingTasks(training);
      
      return { training, evaluation };
    } catch (error) {
      console.error('Error loading tasks:', error);
      throw error;
    }
  };

  const checkUserAuthentication = async () => {
    console.log('Checking user authentication...');
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        console.log('No authenticated user, starting training mode');
        setState(prev => ({ 
          ...prev, 
          status: 'training',
          isInTrainingMode: true 
        }));
        return;
      }

      console.log('User authenticated:', user.id);
      
      // Check how many evaluations the user has completed
      const { data: evaluations, error: evalError } = await supabase
        .from('evaluations')
        .select('*')
        .eq('annotator_id', user.id);

      if (evalError) {
        console.error('Error fetching evaluations:', evalError);
        throw evalError;
      }

      const completedEvaluations = evaluations?.length || 0;
      console.log('Completed evaluations:', completedEvaluations);

      if (completedEvaluations >= allTasks.length) {
        console.log('All tasks completed');
        setState(prev => ({ ...prev, status: 'complete' }));
      } else {
        // Start with training if not completed yet
        if (!isTrainingCompleted) {
          console.log('Starting training mode');
          setState(prev => ({ 
            ...prev, 
            status: 'training',
            isInTrainingMode: true 
          }));
        } else {
          console.log('Starting evaluation mode');
          setEvaluationTaskIndex(completedEvaluations);
          setState(prev => ({ 
            ...prev, 
            status: 'evaluating',
            isInTrainingMode: false 
          }));
        }
      }

    } catch (error) {
      console.error('Error in checkUserAuthentication:', error);
      setState(prev => ({ ...prev, status: 'error', error: error.message }));
    }
  };

  const submitBackgroundSurvey = async (surveyData: any) => {
    console.log('Background survey data received, proceeding to training:', surveyData);
    // Since we don't have background_surveys table, just proceed to training
    setState(prev => ({ 
      ...prev, 
      status: 'training',
      isInTrainingMode: true 
    }));
  };

  const updateCurrentTask = () => {
    if (state.isInTrainingMode && trainingTasks.length > 0) {
      const task = trainingTasks[localTrainingIndex];
      const progress = {
        current: localTrainingIndex,
        total: trainingTasks.length
      };
      
      console.log('Setting training task:', localTrainingIndex, 'of', trainingTasks.length);
      setState(prev => ({ 
        ...prev, 
        currentTask: task, 
        trainingProgress: progress 
      }));
    } else if (!state.isInTrainingMode && allTasks.length > 0) {
      const task = allTasks[evaluationTaskIndex];
      const progress = {
        current: evaluationTaskIndex,
        total: allTasks.length
      };
      
      console.log('Setting evaluation task:', evaluationTaskIndex, 'of', allTasks.length);
      setState(prev => ({ 
        ...prev, 
        currentTask: task, 
        progress: progress 
      }));
    }
  };

  const submitEvaluation = async (scores: { scoreA: number; scoreB: number }) => {
    console.log('Submitting evaluation:', scores);
    
    if (state.isInTrainingMode) {
      // Handle training progression locally
      const nextIndex = localTrainingIndex + 1;
      
      if (nextIndex >= trainingTasks.length) {
        console.log('Training completed, switching to evaluation');
        setIsTrainingCompleted(true);
        setState(prev => ({ 
          ...prev, 
          status: 'evaluating',
          isInTrainingMode: false 
        }));
        setLocalTrainingIndex(0); // Reset for next time
      } else {
        console.log('Moving to next training task:', nextIndex);
        setLocalTrainingIndex(nextIndex);
      }
      return;
    }

    // Handle actual evaluation submission
    if (!state.currentTask) {
      console.error('No current task');
      return;
    }

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw userError;

      const evaluation: Omit<Evaluation, 'id' | 'created_at'> = {
        annotator_id: user.id,
        task_id: Number(state.currentTask.taskId),
        score_a: scores.scoreA,
        score_b: scores.scoreB,
        session_start_time: new Date().toISOString(),
        evaluation_end_time: new Date().toISOString()
      };

      console.log('Inserting evaluation:', evaluation);

      const { error: evalError } = await supabase
        .from('evaluations')
        .insert(evaluation);

      if (evalError) throw evalError;

      const newTaskIndex = evaluationTaskIndex + 1;
      console.log('Moving to next evaluation task:', newTaskIndex);

      if (newTaskIndex >= allTasks.length) {
        console.log('All evaluation tasks completed');
        setState(prev => ({ ...prev, status: 'complete' }));
      } else {
        setEvaluationTaskIndex(newTaskIndex);
      }

    } catch (error) {
      console.error('Error submitting evaluation:', error);
      setState(prev => ({ ...prev, error: error.message }));
    }
  };

  // Initialize the evaluator
  useEffect(() => {
    const initialize = async () => {
      // Skip initialization if we're already past the initializing state
      if (state.status !== 'initializing') {
        return;
      }
      
      try {
        setState(prev => ({ ...prev, status: 'loading_tasks' }));
        await loadTasks();
        await checkUserAuthentication();
      } catch (error) {
        console.error('Initialization error:', error);
        setState(prev => ({ ...prev, status: 'error', error: error.message }));
      }
    };

    initialize();
  }, []); // Remove state.status dependency to prevent re-initialization

  // Update current task when relevant state changes
  useEffect(() => {
    updateCurrentTask();
  }, [state.isInTrainingMode, localTrainingIndex, evaluationTaskIndex, allTasks, trainingTasks]);

  return {
    status: state.status,
    error: state.error,
    currentTask: state.currentTask,
    progress: state.progress,
    trainingProgress: state.trainingProgress,
    isInTrainingMode: state.isInTrainingMode,
    submitEvaluation,
    submitBackgroundSurvey
  };
};
