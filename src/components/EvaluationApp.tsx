
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

  useEffect(() => {
    loadTasks();
    if (user) {
      checkAnnotatorProfile();
    }
  }, [user]);

  const loadTasks = async () => {
    try {
      const response = await fetch('/tasks.json');
      const tasksData = await response.json();
      setTasks(tasksData);
    } catch (error) {
      console.error('Error loading tasks:', error);
      toast.error('Failed to load evaluation tasks');
    }
  };

  const checkAnnotatorProfile = async () => {
    if (!user) return;

    try {
      // First try to get existing annotator
      let { data, error } = await supabase
        .from('annotators')
        .select('*')
        .eq('user_id', user.id)
        .single();

      // If no annotator exists, create one
      if (error && error.code === 'PGRST116') {
        console.log('No annotator found, creating new one...');
        const { data: newAnnotator, error: insertError } = await supabase
          .from('annotators')
          .insert({
            user_id: user.id,
            email: user.email
          })
          .select()
          .single();

        if (insertError) {
          console.error('Error creating annotator:', insertError);
          return;
        }

        data = newAnnotator;
      } else if (error) {
        console.error('Error fetching annotator:', error);
        return;
      }

      console.log('Annotator data:', data);
      setAnnotator(data);
      
      // Check if background survey is needed
      if (!data.expertise_group) {
        console.log('Background survey needed');
        setNeedsBackgroundSurvey(true);
      } else {
        console.log('Background survey completed, loading progress');
        await loadProgress(data.id);
      }
    } catch (error) {
      console.error('Error checking annotator profile:', error);
    }
  };

  const loadProgress = async (annotatorId: string) => {
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

      if (data && data.length > 0) {
        const completedTaskIds = data.map(evaluation => evaluation.task_id);
        const nextTaskIndex = tasks.findIndex(task => !completedTaskIds.includes(task.taskId));
        setCurrentTaskIndex(nextTaskIndex >= 0 ? nextTaskIndex : tasks.length);
      }
    } catch (error) {
      console.error('Error loading progress:', error);
    }
  };

  const handleBackgroundSurveyComplete = () => {
    setNeedsBackgroundSurvey(false);
    checkAnnotatorProfile();
  };

  const handleTaskSubmit = async (scores: { scoreA: number; scoreB: number }) => {
    if (!annotator || !tasks[currentTaskIndex]) return;

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

      if (error) throw error;

      toast.success('Evaluation submitted successfully');
      setCurrentTaskIndex(prev => prev + 1);
    } catch (error) {
      console.error('Error submitting evaluation:', error);
      toast.error('Failed to submit evaluation');
    } finally {
      setLoading(false);
    }
  };

  if (needsBackgroundSurvey) {
    return <BackgroundSurvey onComplete={handleBackgroundSurveyComplete} />;
  }

  if (currentTaskIndex >= tasks.length) {
    return <CompletionPage />;
  }

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
