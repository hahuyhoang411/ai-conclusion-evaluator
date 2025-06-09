
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Task, Annotator } from '@/types/evaluation';
import ScoringRubric from './ScoringRubric';
import TaskEvaluation from './TaskEvaluation';
import CompletionPage from './CompletionPage';
import BackgroundSurvey from './BackgroundSurvey';
import { toast } from 'sonner';

const EvaluationApp = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [currentTaskIndex, setCurrentTaskIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [annotator, setAnnotator] = useState<Annotator | null>(null);
  const [needsBackgroundSurvey, setNeedsBackgroundSurvey] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    loadTasks();
  }, []);

  useEffect(() => {
    if (user && tasks.length > 0) {
      checkAnnotatorProfile();
    }
  }, [user, tasks]);

  const loadTasks = async () => {
    try {
      const response = await fetch('/tasks.json');
      const tasksData = await response.json();
      setTasks(tasksData);
      console.log('Tasks loaded:', tasksData.length);
    } catch (error) {
      console.error('Error loading tasks:', error);
      toast.error('Failed to load evaluation tasks');
    }
  };

  const checkAnnotatorProfile = async () => {
    if (!user) return;
    
    console.log('Checking annotator profile for user:', user.email);
    setIsInitializing(true);

    try {
      // First try to get existing annotator by email
      let { data, error } = await supabase
        .from('annotators')
        .select('*')
        .eq('email', user.email)
        .single();

      // If no annotator exists, create one
      if (error && error.code === 'PGRST116') {
        console.log('No annotator found, creating new one...');
        const { data: newAnnotator, error: insertError } = await supabase
          .from('annotators')
          .insert({
            email: user.email
          })
          .select()
          .single();

        if (insertError) {
          console.error('Error creating annotator:', insertError);
          toast.error('Failed to create user profile');
          setIsInitializing(false);
          return;
        }

        data = newAnnotator;
        console.log('New annotator created:', data);
      } else if (error) {
        console.error('Error fetching annotator:', error);
        toast.error('Failed to load user profile');
        setIsInitializing(false);
        return;
      }

      console.log('Annotator data:', data);
      setAnnotator(data);
      
      // Check if background survey is needed
      if (!data.expertise_group) {
        console.log('Background survey needed');
        setNeedsBackgroundSurvey(true);
        setIsInitializing(false);
      } else {
        console.log('Background survey completed, loading progress');
        await loadProgress(data.id);
        setIsInitializing(false);
      }
    } catch (error) {
      console.error('Error checking annotator profile:', error);
      toast.error('Failed to initialize user profile');
      setIsInitializing(false);
    }
  };

  const loadProgress = async (annotatorId: string) => {
    console.log('Loading progress for annotator:', annotatorId);
    try {
      const { data, error } = await supabase
        .from('evaluations')
        .select('task_id')
        .eq('annotator_id', annotatorId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading progress:', error);
        return;
      }

      console.log('Evaluation data:', data);
      if (data && data.length > 0) {
        const completedTaskIds = data.map(evaluation => evaluation.task_id).filter(id => id !== null);
        console.log('Completed task IDs:', completedTaskIds);
        const nextTaskIndex = tasks.findIndex(task => !completedTaskIds.includes(task.taskId));
        console.log('Next task index:', nextTaskIndex);
        setCurrentTaskIndex(nextTaskIndex >= 0 ? nextTaskIndex : tasks.length);
      } else {
        console.log('No previous evaluations found, starting from task 0');
        setCurrentTaskIndex(0);
      }
    } catch (error) {
      console.error('Error loading progress:', error);
    }
  };

  const handleBackgroundSurveyComplete = () => {
    console.log('Background survey completed');
    setNeedsBackgroundSurvey(false);
    // Reload annotator profile to get updated expertise_group
    checkAnnotatorProfile();
  };

  const handleTaskSubmit = async (scores: { scoreA: number; scoreB: number }) => {
    if (!annotator || !tasks[currentTaskIndex]) {
      console.error('Missing annotator or task data');
      return;
    }

    console.log('Submitting task:', currentTaskIndex, 'with scores:', scores);
    setLoading(true);
    
    try {
      const { error } = await supabase
        .from('evaluations')
        .insert({
          annotator_id: annotator.id,
          task_id: tasks[currentTaskIndex].taskId,
          score_a: scores.scoreA,
          score_b: scores.scoreB,
          session_start_time: new Date().toISOString(),
          evaluation_end_time: new Date().toISOString()
        });

      if (error) {
        console.error('Error submitting evaluation:', error);
        throw error;
      }

      console.log('Evaluation submitted successfully');
      toast.success('Evaluation submitted successfully');
      
      // Move to next task
      const nextIndex = currentTaskIndex + 1;
      console.log('Moving to task index:', nextIndex);
      setCurrentTaskIndex(nextIndex);
    } catch (error) {
      console.error('Error submitting evaluation:', error);
      toast.error('Failed to submit evaluation');
    } finally {
      setLoading(false);
    }
  };

  // Show loading while initializing
  if (isInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg text-gray-600">Initializing...</p>
        </div>
      </div>
    );
  }

  // Show background survey if needed
  if (needsBackgroundSurvey) {
    return <BackgroundSurvey onComplete={handleBackgroundSurveyComplete} />;
  }

  // Show completion page if all tasks done
  if (currentTaskIndex >= tasks.length) {
    return <CompletionPage />;
  }

  // Show loading if tasks not loaded yet
  if (tasks.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg text-gray-600">Loading evaluation tasks...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Human Evaluation Study
          </h1>
          <p className="text-gray-600">
            Please evaluate the quality of AI-generated conclusions compared to the reference
          </p>
        </div>
        
        <ScoringRubric />
        
        <TaskEvaluation
          task={tasks[currentTaskIndex]}
          currentTaskIndex={currentTaskIndex}
          totalTasks={tasks.length}
          onSubmit={handleTaskSubmit}
          loading={loading}
        />
      </div>
    </div>
  );
};

export default EvaluationApp;
