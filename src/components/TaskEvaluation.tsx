
import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Task } from '@/types/evaluation';
import { Eye, EyeOff, GraduationCap } from 'lucide-react';
import TaskTimer from './TaskTimer';
import MarkdownRenderer from './MarkdownRenderer';
import TrainingHighlight from './TrainingHighlight';

interface TaskEvaluationProps {
  task: Task;
  currentTaskIndex: number;
  totalTasks: number;
  onSubmit: (scores: { scoreA: number; scoreB: number }) => void;
  loading: boolean;
  isTraining?: boolean;
}

const TaskEvaluation: React.FC<TaskEvaluationProps> = ({
  task,
  currentTaskIndex,
  totalTasks,
  onSubmit,
  loading,
  isTraining = false
}) => {
  const [scoreA, setScoreA] = useState<string>('');
  const [scoreB, setScoreB] = useState<string>('');
  const [showAbstracts, setShowAbstracts] = useState(false);
  const [showCorrectScores, setShowCorrectScores] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (scoreA && scoreB) {
      onSubmit({
        scoreA: parseInt(scoreA),
        scoreB: parseInt(scoreB)
      });
      setScoreA('');
      setScoreB('');
      setShowCorrectScores(false);
    }
  };

  const scoreOptions = [
    { value: '0', label: '0 - No Similarity / Contradictory or Irrelevant' },
    { value: '1', label: '1 - Very Low Similarity / Barely Related' },
    { value: '2', label: '2 - Low Similarity / Superficially Related' },
    { value: '3', label: '3 - Moderate Similarity / Partially Equivalent' },
    { value: '4', label: '4 - High Similarity / Mostly Equivalent' },
    { value: '5', label: '5 - Excellent Similarity / Semantically Equivalent' },
  ];

  const getTaskTitle = () => {
    if (task.sourcePaperTitle) {
      return `Paper Title: ${task.sourcePaperTitle}`;
    }
    return task.metaAnalysisName || 'Meta Analysis';
  };

  return (
    <div className="space-y-6">
      {!isTraining && <TaskTimer isActive={true} />}
      
      {/* Progress Tracker */}
      <div className="bg-white p-4 rounded-lg shadow-sm border">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">
            {isTraining ? 'Training' : 'Task'} {currentTaskIndex + 1} of {totalTasks}
          </h2>
          <div className="flex items-center">
            <div className="text-sm text-gray-600">
              Progress: {Math.round(((currentTaskIndex + 1) / totalTasks) * 100)}%
            </div>
          </div>
        </div>
        <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
          <div 
            className={`h-2 rounded-full transition-all duration-300 ${
              isTraining ? 'bg-blue-600' : 'bg-green-600'
            }`}
            style={{ width: `${((currentTaskIndex + 1) / totalTasks) * 100}%` }}
          ></div>
        </div>
      </div>

      {/* Task Title */}
      <Card>
        <CardHeader>
          <div className='mb-4'>
            <h3 className="text-sm font-semibold text-gray-500">
              {task.sourcePaperTitle ? 'Source Paper' : 'Meta Analysis'}
            </h3>
            <p className="text-lg text-gray-800">{getTaskTitle()}</p>
          </div>
        </CardHeader>
      </Card>

      {/* Source Abstracts Toggle */}
      <div>
        <Button
          variant="outline"
          onClick={() => setShowAbstracts(!showAbstracts)}
          className="flex items-center gap-2"
        >
          {showAbstracts ? <EyeOff size={16} /> : <Eye size={16} />}
          {showAbstracts ? 'Hide' : 'Show'} Source Abstracts
        </Button>
        
        {showAbstracts && (
          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Source Abstracts</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {task.sourceAbstracts.map((abstract, index) => (
                <div key={index} className="p-3 bg-gray-50 rounded-lg">
                  <div className="text-gray-800 prose prose-sm max-w-none">
                    <MarkdownRenderer content={abstract} />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Training Mode: Enhanced Reference Display */}
      {isTraining && task.correctScores && (
        <div>
          <Button
            variant="outline"
            onClick={() => setShowCorrectScores(!showCorrectScores)}
            className="flex items-center gap-2 bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
          >
            <GraduationCap size={16} />
            {showCorrectScores ? 'Hide' : 'Show'} Reference Scores & Highlights
          </Button>
          
          {showCorrectScores && (
            <div className="mt-4">
              <TrainingHighlight
                referenceConclusion={task.referenceConclusion}
                conclusionA={task.modelOutputs.conclusionA}
                conclusionB={task.modelOutputs.conclusionB}
                correctScores={task.correctScores}
                sentenceMappings={task.sentenceMappings}
              />
            </div>
          )}
        </div>
      )}

      {/* Regular Reference Conclusion (for non-training or when training highlights are hidden) */}
      {(!isTraining || !showCorrectScores) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-blue-900">Reference Conclusion</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-800 leading-relaxed">{task.referenceConclusion}</p>
          </CardContent>
        </Card>
      )}

      {/* Side-by-Side Comparison (for evaluation or when training highlights are hidden) */}
      {(!isTraining || !showCorrectScores) && (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Conclusion A */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-green-700">
                  Conclusion 1
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-800 leading-relaxed mb-4 whitespace-pre-line">
                  {task.modelOutputs.conclusionA}
                </p>
                
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">
                    Score for Conclusion 1:
                  </Label>
                  <RadioGroup value={scoreA} onValueChange={setScoreA} className="space-y-2">
                    {scoreOptions.map((option) => (
                      <div key={option.value} className="flex items-center space-x-2">
                        <RadioGroupItem value={option.value} id={`a-${option.value}`} />
                        <Label htmlFor={`a-${option.value}`} className="text-sm cursor-pointer flex-1">
                          {option.label}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>
              </CardContent>
            </Card>

            {/* Conclusion B */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-purple-700">
                  Conclusion 2
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-800 leading-relaxed mb-4 whitespace-pre-line">
                  {task.modelOutputs.conclusionB}
                </p>
                
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">
                    Score for Conclusion 2:
                  </Label>
                  <RadioGroup value={scoreB} onValueChange={setScoreB} className="space-y-2">
                    {scoreOptions.map((option) => (
                      <div key={option.value} className="flex items-center space-x-2">
                        <RadioGroupItem value={option.value} id={`b-${option.value}`} />
                        <Label htmlFor={`b-${option.value}`} className="text-sm cursor-pointer flex-1">
                          {option.label}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Submit Button */}
          <div className="flex justify-center">
            <Button 
              type="submit" 
              size="lg"
              disabled={!scoreA || !scoreB || loading}
              className={`px-8 ${isTraining ? 'bg-blue-600 hover:bg-blue-700' : ''}`}
            >
              {loading ? 'Submitting...' : isTraining ? 'Next Training Task' : 'Submit and Next'}
            </Button>
          </div>
        </form>
      )}

      {/* Training Mode: Scoring Form (when reference is shown) */}
      {isTraining && showCorrectScores && (
        <form onSubmit={handleSubmit} className="space-y-6">
          <Card className="bg-blue-50 border-blue-200">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-blue-800">
                Practice Scoring
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">
                    Your Score for Conclusion 1:
                  </Label>
                  <RadioGroup value={scoreA} onValueChange={setScoreA} className="space-y-1">
                    {scoreOptions.map((option) => (
                      <div key={option.value} className="flex items-center space-x-2">
                        <RadioGroupItem value={option.value} id={`train-a-${option.value}`} />
                        <Label htmlFor={`train-a-${option.value}`} className="text-sm cursor-pointer flex-1">
                          {option.label}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">
                    Your Score for Conclusion 2:
                  </Label>
                  <RadioGroup value={scoreB} onValueChange={setScoreB} className="space-y-1">
                    {scoreOptions.map((option) => (
                      <div key={option.value} className="flex items-center space-x-2">
                        <RadioGroupItem value={option.value} id={`train-b-${option.value}`} />
                        <Label htmlFor={`train-b-${option.value}`} className="text-sm cursor-pointer flex-1">
                          {option.label}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>
              </div>

              <div className="flex justify-center">
                <Button 
                  type="submit" 
                  size="lg"
                  disabled={!scoreA || !scoreB || loading}
                  className="px-8 bg-blue-600 hover:bg-blue-700"
                >
                  {loading ? 'Submitting...' : 'Next Training Task'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      )}
    </div>
  );
};

export default TaskEvaluation;
