import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { HelpCircle, Star } from 'lucide-react';
import { DetailedScore } from '@/types/evaluation';

interface TrainingHighlightProps {
  referenceConclusion: string;
  conclusionA: string;
  conclusionB: string;
  correctScores: {
    modelA_score: number;
    modelB_score: number;
  };
  detailedScoring?: {
    modelA: DetailedScore[];
    modelB: DetailedScore[];
  };
}

const TrainingHighlight: React.FC<TrainingHighlightProps> = ({
  referenceConclusion,
  conclusionA,
  conclusionB,
  correctScores,
  detailedScoring,
}) => {
  const [hoveredSentenceIndex, setHoveredSentenceIndex] = useState<number | null>(null);

  const splitIntoSentences = (text: string): string[] => {
    if (!text) return [];
    // This regex is designed to split sentences more reliably, handling cases like "e.g." and trailing spaces.
    const sentences = text.match(/[^.!?]+[.!?]+|\S+/g) || [];
    return sentences.map(s => s.trim()).filter(s => s.length > 0);
  };

  const referenceSentences = useMemo(() => splitIntoSentences(referenceConclusion), [referenceConclusion]);

  const getHighlightedConclusion = (
    conclusionText: string,
    scores: DetailedScore[] | undefined
  ) => {
    if (hoveredSentenceIndex === null || !scores) {
      return <span>{conclusionText}</span>;
    }

    const relevantScore = scores.find(
      (s) => s.ref_sentence_index === hoveredSentenceIndex
    );

    if (!relevantScore || !relevantScore.conclusion_fragment) {
      return <span>{conclusionText}</span>;
    }

    const fragment = relevantScore.conclusion_fragment;
    const parts = conclusionText.split(fragment);

    return (
      <span>
        {parts.map((part, i) => (
          <React.Fragment key={i}>
            {part}
            {i < parts.length - 1 && (
              <span className="bg-yellow-200 shadow-lg rounded px-1">
                {fragment}
              </span>
            )}
          </React.Fragment>
        ))}
      </span>
    );
  };
  
  const renderScore = (score: number) => (
    <div className="flex items-center gap-1">
      {[...Array(5)].map((_, i) => (
        <Star
          key={i}
          size={16}
          className={i < score ? 'text-amber-500 fill-amber-500' : 'text-gray-300'}
        />
      ))}
       <span className="font-bold text-amber-600 ml-1">({score.toFixed(1)})</span>
    </div>
  )

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
                    Hover over a sentence in the reference to see how it was scored against each conclusion. 
                    The corresponding text in the conclusions below will be highlighted.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-gray-800 leading-relaxed">
            {referenceSentences.map((sentence, index) => {
              const scoresA = detailedScoring?.modelA.find(s => s.ref_sentence_index === index);
              const scoresB = detailedScoring?.modelB.find(s => s.ref_sentence_index === index);

              return (
                <TooltipProvider key={index} delayDuration={100}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span
                        className="inline-block transition-all duration-200 cursor-pointer hover:bg-yellow-100 border-b border-dotted border-gray-400"
                        onMouseEnter={() => setHoveredSentenceIndex(index)}
                        onMouseLeave={() => setHoveredSentenceIndex(null)}
                      >
                        {sentence}{' '}
                      </span>
                    </TooltipTrigger>
                    {(scoresA || scoresB) && (
                      <TooltipContent className="max-w-md p-4 bg-white border shadow-lg rounded-lg">
                        <div className="space-y-3">
                          {scoresA && (
                            <div>
                              <p className="text-sm font-semibold text-green-700">Conclusion 1 Analysis</p>
                              {renderScore(scoresA.score)}
                              <p className="text-xs text-gray-600 mt-1 italic">"{scoresA.explanation}"</p>
                            </div>
                          )}
                          {scoresB && (
                            <div>
                              <p className="text-sm font-semibold text-purple-700">Conclusion 2 Analysis</p>
                              {renderScore(scoresB.score)}
                              <p className="text-xs text-gray-600 mt-1 italic">"{scoresB.explanation}"</p>
                            </div>
                          )}
                        </div>
                      </TooltipContent>
                    )}
                  </Tooltip>
                </TooltipProvider>
              )
            })}
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
              {getHighlightedConclusion(conclusionA, detailedScoring?.modelA)}
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
              {getHighlightedConclusion(conclusionB, detailedScoring?.modelB)}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TrainingHighlight;
