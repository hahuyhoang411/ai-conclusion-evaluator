import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Task, Evaluation } from '@/types/evaluation';

interface Progress {
  current: number;
  total: number;
}

interface UserProgress {
  annotator_id: string;
  tasks_completed: number;
  training_completed: boolean;
  session_start_time: string;
}

interface EvaluatorState {
  status: 'initializing' | 'loading_tasks' | 'needs_survey' | 'training' | 'evaluating' | 'complete' | 'error';
  error: string | null;
  currentTask: Task | null;
  progress: Progress;
  trainingProgress: Progress;
  isInTrainingMode: boolean;
}

const STORAGE_KEY = 'evaluator_state';
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
  const [userProgress, setUserProgress] = useState<UserProgress | null>(null);
  const [localTrainingIndex, setLocalTrainingIndex] = useState(0);

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

  const loadUserAndProgress = async () => {
    console.log('Loading user and progress...');
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        console.log('No authenticated user, redirecting to survey');
        setState(prev => ({ ...prev, status: 'needs_survey' }));
        return;
      }

      console.log('User found:', user.id);

      const { data: progress, error: progressError } = await supabase
        .from('user_progress')
        .select('*')
        .eq('annotator_id', user.id)
        .single();

      if (progressError && progressError.code !== 'PGRST116') {
        console.error('Error fetching progress:', progressError);
        throw progressError;
      }

      if (!progress) {
        console.log('No progress found, user needs survey');
        setState(prev => ({ ...prev, status: 'needs_survey' }));
        return;
      }

      console.log('User progress:', progress);
      setUserProgress(progress);

      // Check if training is completed - force training if not completed
      const forceTraining = !progress.training_completed;
      console.log('Training completed:', progress.training_completed, 'Force training:', forceTraining);

      if (forceTraining) {
        console.log('Starting training mode');
        setState(prev => ({ 
          ...prev, 
          status: 'training',
          isInTrainingMode: true 
        }));
      } else if (progress.tasks_completed >= allTasks.length) {
        console.log('All tasks completed');
        setState(prev => ({ ...prev, status: 'complete' }));
      } else {
        console.log('Starting evaluation mode');
        setState(prev => ({ 
          ...prev, 
          status: 'evaluating',
          isInTrainingMode: false 
        }));
      }

    } catch (error) {
      console.error('Error in loadUserAndProgress:', error);
      setState(prev => ({ ...prev, status: 'error', error: error.message }));
    }
  };

  const submitBackgroundSurvey = async (surveyData: any) => {
    console.log('Submitting background survey:', surveyData);
    try {
      setState(prev => ({ ...prev, status: 'loading_tasks' }));
      
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw userError;

      const { error: surveyError } = await supabase
        .from('background_surveys')
        .insert({
          annotator_id: user.id,
          ...surveyData
        });

      if (surveyError) throw surveyError;

      const { error: progressError } = await supabase
        .from('user_progress')
        .insert({
          annotator_id: user.id,
          tasks_completed: 0,
          training_completed: false,
          session_start_time: new Date().toISOString()
        });

      if (progressError) throw progressError;

      console.log('Survey submitted, starting training');
      setState(prev => ({ 
        ...prev, 
        status: 'training',
        isInTrainingMode: true 
      }));
      
    } catch (error) {
      console.error('Error submitting survey:', error);
      setState(prev => ({ ...prev, status: 'error', error: error.message }));
    }
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
    } else if (!state.isInTrainingMode && allTasks.length > 0 && userProgress) {
      const taskIndex = userProgress.tasks_completed;
      const task = allTasks[taskIndex];
      const progress = {
        current: taskIndex,
        total: allTasks.length
      };
      
      console.log('Setting evaluation task:', taskIndex, 'of', allTasks.length);
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
        
        // Mark training as completed in database
        if (userProgress) {
          try {
            const { error } = await supabase
              .from('user_progress')
              .update({ training_completed: true })
              .eq('annotator_id', userProgress.annotator_id);
            
            if (error) throw error;
            
            setUserProgress(prev => prev ? { ...prev, training_completed: true } : null);
          } catch (error) {
            console.error('Error updating training completion:', error);
          }
        }
        
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
    if (!state.currentTask || !userProgress) {
      console.error('No current task or user progress');
      return;
    }

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw userError;

      const evaluation: Omit<Evaluation, 'id' | 'created_at'> = {
        annotator_id: user.id,
        task_id: parseInt(state.currentTask.id.toString()),
        score_a: scores.scoreA,
        score_b: scores.scoreB,
        session_start_time: userProgress.session_start_time,
        evaluation_end_time: new Date().toISOString()
      };

      console.log('Inserting evaluation:', evaluation);

      const { error: evalError } = await supabase
        .from('evaluations')
        .insert(evaluation);

      if (evalError) throw evalError;

      const newTasksCompleted = userProgress.tasks_completed + 1;
      console.log('Updating tasks completed to:', newTasksCompleted);

      const { error: progressError } = await supabase
        .from('user_progress')
        .update({ tasks_completed: newTasksCompleted })
        .eq('annotator_id', user.id);

      if (progressError) throw progressError;

      setUserProgress(prev => prev ? { ...prev, tasks_completed: newTasksCompleted } : null);

      if (newTasksCompleted >= allTasks.length) {
        console.log('All evaluation tasks completed');
        setState(prev => ({ ...prev, status: 'complete' }));
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
        await loadUserAndProgress();
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
  }, [state.isInTrainingMode, localTrainingIndex, userProgress, allTasks, trainingTasks]);

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
