import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { HelpCircle } from 'lucide-react';
import { SentenceComparison } from '@/types/evaluation';

interface TrainingHighlightProps {
  referenceConclusion: string;
  conclusionA: string;
  conclusionB: string;
  correctScores: {
    modelA_score: number;
    modelB_score: number;
  };
  detailedComparisons?: SentenceComparison[];
}

const TrainingHighlight: React.FC<TrainingHighlightProps> = ({
  referenceConclusion,
  conclusionA,
  conclusionB,
  correctScores,
  detailedComparisons
}) => {
  const [hoveredSentenceIndex, setHoveredSentenceIndex] = useState<number | null>(null);

  const splitIntoSentences = (text: string): string[] => {
    const protectedText = text.replace(/(\d+\.\d+)/g, '###DECIMAL$1###');
    const sentences = protectedText
      .split(/(?<=[.!?])\s+(?=[A-Z])/)
      .map(s => s.trim())
      .filter(s => s.length > 0)
      .map(s => {
        return s.replace(/###DECIMAL(\d+\.\d+)###/g, '$1');
      });

    return sentences;
  };

  const referenceSentences = useMemo(() => splitIntoSentences(referenceConclusion), [referenceConclusion]);

  const renderReferenceText = () => {
    return (
      <div className="space-y-1">
        {referenceSentences.map((sentence, index) => {
          const isHovered = hoveredSentenceIndex === index;
          
          return (
            <span
              key={index}
              className={`inline-block transition-all duration-200 cursor-pointer ${
                isHovered
                  ? 'bg-blue-200 shadow-lg transform scale-105 rounded px-1'
                  : 'hover:bg-blue-100'
              } border-b border-dotted border-gray-300`}
              onMouseEnter={() => setHoveredSentenceIndex(index)}
              onMouseLeave={() => setHoveredSentenceIndex(null)}
            >
              {sentence}{index < referenceSentences.length - 1 ? ' ' : ''}
            </span>
          );
        })}
      </div>
    );
  };
  
  const renderConclusionText = (conclusion: string, type: 'A' | 'B') => {
    if (hoveredSentenceIndex === null || !detailedComparisons) {
      return <p className="text-gray-800 leading-relaxed whitespace-pre-line">{conclusion}</p>;
    }

    const comparison = detailedComparisons.find(c => c.ref_sentence_index === hoveredSentenceIndex);
    if (!comparison) {
      return <p className="text-gray-800 leading-relaxed whitespace-pre-line">{conclusion}</p>;
    }
    
    const subComparison = type === 'A' ? comparison.conclusionA : comparison.conclusionB;
    const fragment = subComparison.conclusion_fragment;

    if (fragment === '(Not clearly addressed)' || fragment === '(Not explicitly addressed)') {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <p className="text-gray-800 leading-relaxed whitespace-pre-line bg-gray-200 rounded p-2">
                {conclusion}
                <span className="block text-sm font-semibold mt-2 bg-yellow-200 rounded px-1 w-fit">
                  Score: {subComparison.score} - Fragment not addressed.
                </span>
              </p>
            </TooltipTrigger>
            <TooltipContent>
              <p className="max-w-xs">{subComparison.explanation}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }
    
    const parts = conclusion.split(new RegExp(`(${fragment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`));
    
    return (
      <p className="text-gray-800 leading-relaxed whitespace-pre-line">
        {parts.map((part, index) => {
          if (part === fragment) {
            return (
              <TooltipProvider key={index}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="bg-yellow-200 shadow-lg transform scale-105 rounded px-1">
                      {part}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">
                      <strong>Score: {subComparison.score}</strong><br />
                      {subComparison.explanation}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            );
          }
          return <span key={index}>{part}</span>;
        })}
      </p>
    );
  };


  return (
    <div className="space-y-6">
      {/* Reference Conclusion with Help */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg font-semibold text-blue-800">
              Reference Conclusion
            </CardTitle>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <HelpCircle size={16} className="text-blue-600 hover:text-blue-800" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs">
                    Hover over sentences in this reference to see which parts of the generated conclusions match. 
                    This helps you understand how the scoring was determined.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-gray-800 leading-relaxed">
            {renderReferenceText()}
          </div>
        </CardContent>
      </Card>

      {/* Side-by-Side Conclusions */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Conclusion A */}
        <Card className="border-green-200">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-green-700">
              Conclusion 1 (Score: {correctScores.modelA_score.toFixed(1)})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {renderConclusionText(conclusionA, 'A')}
          </CardContent>
        </Card>

        {/* Conclusion B */}
        <Card className="border-purple-200">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-purple-700">
              Conclusion 2 (Score: {correctScores.modelB_score.toFixed(1)})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {renderConclusionText(conclusionB, 'B')}
          </CardContent>
        </Card>
      </div>

      {hoveredSentenceIndex !== null && detailedComparisons?.find(c => c.ref_sentence_index === hoveredSentenceIndex) && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <p className="text-sm text-amber-800">
            <strong>Highlighting:</strong> Sentence {hoveredSentenceIndex + 1} from the reference and its potential matches in the generated conclusions.
            Yellow highlights show content similarity that contributes to scoring.
          </p>
        </div>
      )}
    </div>
  );
};

export default TrainingHighlight;
