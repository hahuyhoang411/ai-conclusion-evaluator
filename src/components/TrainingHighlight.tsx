import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { HelpCircle, Info } from 'lucide-react';
import { DetailedBreakdown, Match } from '@/types/evaluation';

interface TrainingHighlightProps {
  referenceConclusion: string;
  conclusionA: string;
  conclusionB: string;
  correctScores: {
    modelA_score: number;
    modelB_score: number;
  };
  detailedBreakdown?: DetailedBreakdown[];
}

const TrainingHighlight: React.FC<TrainingHighlightProps> = ({
  referenceConclusion,
  conclusionA,
  conclusionB,
  correctScores,
  detailedBreakdown
}) => {
  const [hoveredSentenceIndex, setHoveredSentenceIndex] = useState<number | null>(null);

  const splitIntoSentences = (text: string): string[] => {
    const protectedText = text.replace(/(\d+\.\d+)/g, '###DECIMAL$1###');
    const sentences = protectedText
      .split(/(?<=[.!?])\s+(?=[A-Z])/)
      .map(s => s.trim())
      .filter(s => s.length > 0)
      .map(s => s.replace(/###DECIMAL(\d+\.\d+)###/g, '$1'));
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
                  ? 'bg-yellow-200 shadow-lg transform scale-105 rounded px-1'
                  : 'hover:bg-yellow-50'
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

  const renderConclusion = (conclusionText: string, match: Match | undefined) => {
    const cleanedConclusion = conclusionText.replace(/\*\*Primary Concluding Statement:\*\*\s*\n*/, '');
    
    if (!match || !match.phrase) {
      return <span>{cleanedConclusion}</span>;
    }

    const { phrase, score, justification } = match;
    const parts = cleanedConclusion.split(phrase);
    
    if (parts.length === 1) {
      return <span>{cleanedConclusion}</span>
    }

    return (
      <span>
        {parts[0]}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="bg-yellow-200 shadow-lg transform scale-105 rounded px-1">
                {phrase}
              </span>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs bg-gray-800 text-white p-3 rounded-lg shadow-lg border-0">
              <div className="flex items-start space-x-2">
                <Info size={16} className="mt-1" />
                <div>
                  <p className="font-bold">Score: {score.toFixed(1)}</p>
                  <p>{justification}</p>
                </div>
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        {parts[1]}
      </span>
    );
  };

  const activeMatchA = hoveredSentenceIndex !== null ? detailedBreakdown?.find(d => d.ref_sentence_index === hoveredSentenceIndex)?.matches.A : undefined;
  const activeMatchB = hoveredSentenceIndex !== null ? detailedBreakdown?.find(d => d.ref_sentence_index === hoveredSentenceIndex)?.matches.B : undefined;

  if (!detailedBreakdown) {
    // Fallback to old rendering if detailedBreakdown is not available
    return <div>Training data breakdown not available for this task.</div>;
  }

  return (
    <div className="space-y-6">
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

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="border-green-200">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-green-700">
              Conclusion 1 (Score: {correctScores.modelA_score.toFixed(1)})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-gray-800 leading-relaxed">
              {renderConclusion(conclusionA, activeMatchA)}
            </div>
          </CardContent>
        </Card>

        <Card className="border-purple-200">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-purple-700">
              Conclusion 2 (Score: {correctScores.modelB_score.toFixed(1)})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-gray-800 leading-relaxed">
              {renderConclusion(conclusionB, activeMatchB)}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TrainingHighlight;
