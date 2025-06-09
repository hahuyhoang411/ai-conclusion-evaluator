import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Task } from '@/types/evaluation';
import { Eye, EyeOff } from 'lucide-react';

interface TaskEvaluationProps {
  task: Task;
  currentTaskIndex: number;
  totalTasks: number;
  onSubmit: (scores: { scoreA: number; scoreB: number }) => void;
  loading: boolean;
}

const TaskEvaluation: React.FC<TaskEvaluationProps> = ({
  task,
  currentTaskIndex,
  totalTasks,
  onSubmit,
  loading
}) => {
  const [scoreA, setScoreA] = useState<string>('');
  const [scoreB, setScoreB] = useState<string>('');
  const [showAbstracts, setShowAbstracts] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (scoreA && scoreB) {
      onSubmit({
        scoreA: parseInt(scoreA),
        scoreB: parseInt(scoreB)
      });
      setScoreA('');
      setScoreB('');
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

  return (
    <div className="space-y-6">
      {currentTaskIndex === 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-xl font-bold">Introduction</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-gray-700">
            <p>
              This is a human evaluation task to compare the output from an AI-generated conclusion of a meta-analysis with the original meta-analysis.
            </p>
            <p>
              As an annotator, you will be provided with a <strong>Scoring Rubric (0-5 Scale)</strong> as a reference. You will see a <strong>Reference Conclusion</strong>, which is the original conclusion from the meta-analysis paper. Your task is to compare the reference conclusion with two AI-generated conclusions, labeled <strong>Conclusion A</strong> and <strong>Conclusion B</strong>, and score their similarity.
            </p>
            <p>
              You can also expand the <strong>Source Abstracts</strong> to see the abstracts of the papers that the meta-analysis was based on. The estimated time to complete all tasks is around 1 hour.
            </p>
            <p>
              Please note that you may see the same Reference Conclusion multiple times, but with different AI-generated conclusions.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Progress Tracker */}
      <div className="bg-white p-4 rounded-lg shadow-sm border">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">Task {currentTaskIndex + 1} of {totalTasks}</h2>
          <div className="text-sm text-gray-600">
            Progress: {Math.round(((currentTaskIndex + 1) / totalTasks) * 100)}%
          </div>
        </div>
        <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${((currentTaskIndex + 1) / totalTasks) * 100}%` }}
          ></div>
        </div>
      </div>

      <h2 className="text-2xl font-bold text-center text-gray-800 my-4">
        {task.metaAnalysisName}
      </h2>

      {/* Reference Conclusion */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-blue-900">Reference Conclusion</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-800 leading-relaxed">{task.referenceConclusion}</p>
        </CardContent>
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
                  <p className="text-gray-800">{abstract}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Side-by-Side Comparison */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid md:grid-cols-2 gap-6">
          {/* Conclusion A */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-green-700">Conclusion A</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-800 leading-relaxed mb-4">{task.modelOutputs.conclusionA}</p>
              
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">
                  Score for Conclusion A:
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
              <CardTitle className="text-lg font-semibold text-purple-700">Conclusion B</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-800 leading-relaxed mb-4">{task.modelOutputs.conclusionB}</p>
              
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">
                  Score for Conclusion B:
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
            className="px-8"
          >
            {loading ? 'Submitting...' : 'Submit and Next'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default TaskEvaluation;
