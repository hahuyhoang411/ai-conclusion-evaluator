
import React from 'react';
import { useEvaluator } from '@/hooks/useEvaluator';
import Introduction from './Introduction';
import ScoringRubric from './ScoringRubric';
import TaskEvaluation from './TaskEvaluation';
import CompletionPage from './CompletionPage';
import BackgroundSurvey from './BackgroundSurvey';
import { Button } from './ui/button';

const EvaluationApp = () => {
  const { 
    status, 
    error, 
    currentTask,
    progress, 
    trainingProgress,
    isInTrainingMode,
    submitEvaluation, 
    submitBackgroundSurvey 
  } = useEvaluator();

  if (status === 'initializing' || status === 'loading_tasks') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg text-gray-600">Initializing...</p>
        </div>
      </div>
    );
  }

  if (status === 'needs_survey') {
    return <BackgroundSurvey onSubmit={submitBackgroundSurvey} />;
  }
  
  if (status === 'complete') {
    return <CompletionPage />;
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-center">
        <p className="text-lg text-red-600 mb-4">An error occurred.</p>
        <p className="text-md text-gray-700 mb-4">{error}</p>
        <p className="text-sm text-gray-500 mb-6">Please ensure your Supabase RLS policies are correctly configured and try again.</p>
        <Button onClick={() => window.location.reload()}>Try Again</Button>
      </div>
    );
  }

  if ((status === 'training' || status === 'evaluating') && currentTask) {
    const currentProgress = isInTrainingMode ? trainingProgress : progress;
    const modeTitle = isInTrainingMode ? 'Training Phase' : 'Evaluation Phase';
    const modeDescription = isInTrainingMode 
      ? 'Complete these training examples to familiarize yourself with the scoring process'
      : 'Please evaluate the quality of AI-generated conclusions compared to the reference';

    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-6xl mx-auto px-4">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Human Evaluation Study - {modeTitle}
            </h1>
            <p className="text-gray-600">
              {modeDescription}
            </p>
            {isInTrainingMode && (
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-blue-800 font-medium">
                  🎯 Training Mode: Practice scoring before the actual evaluation
                </p>
                <p className="text-blue-600 text-sm mt-1">
                  These tasks include correct scores for reference - use them to calibrate your scoring
                </p>
              </div>
            )}
          </div>
          
          <Introduction />
          <ScoringRubric />
          
          <TaskEvaluation
            task={currentTask}
            currentTaskIndex={currentProgress.current}
            totalTasks={currentProgress.total}
            onSubmit={submitEvaluation}
            loading={false}
            isTraining={isInTrainingMode}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <p className="text-lg text-gray-600">Loading...</p>
      </div>
    </div>
  );
};

export default EvaluationApp;
