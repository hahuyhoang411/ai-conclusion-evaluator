
import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { HelpCircle } from 'lucide-react';

interface TrainingHighlightProps {
  referenceConclusion: string;
  conclusionA: string;
  conclusionB: string;
  correctScores: {
    modelA_score: number;
    modelB_score: number;
  };
}

const TrainingHighlight: React.FC<TrainingHighlightProps> = ({
  referenceConclusion,
  conclusionA,
  conclusionB,
  correctScores
}) => {
  const [hoveredSentenceIndex, setHoveredSentenceIndex] = useState<number | null>(null);

  // Enhanced sentence splitting that handles decimal numbers
  const splitIntoSentences = (text: string): string[] => {
    // First, protect decimal numbers by temporarily replacing them
    const protectedText = text.replace(/(\d+\.\d+)/g, '###DECIMAL$1###');
    
    // Split on sentence endings, but be more careful about periods
    const sentences = protectedText
      .split(/(?<=[.!?])\s+(?=[A-Z])/) // Split on sentence endings followed by whitespace and capital letter
      .map(s => s.trim())
      .filter(s => s.length > 0)
      .map(s => {
        // Restore decimal numbers
        return s.replace(/###DECIMAL(\d+\.\d+)###/g, '$1');
      });

    return sentences;
  };

  const referenceSentences = useMemo(() => splitIntoSentences(referenceConclusion), [referenceConclusion]);
  const conclusionASentences = useMemo(() => splitIntoSentences(conclusionA), [conclusionA]);
  const conclusionBSentences = useMemo(() => splitIntoSentences(conclusionB), [conclusionB]);

  // Simple keyword-based matching for demonstration
  const findMatchingSentences = (referenceSentence: string, targetSentences: string[]): number[] => {
    const referenceWords = referenceSentence.toLowerCase().split(/\s+/).filter(word => word.length > 3);
    const matches: number[] = [];

    targetSentences.forEach((sentence, index) => {
      const sentenceWords = sentence.toLowerCase().split(/\s+/);
      const commonWords = referenceWords.filter(word => sentenceWords.some(sw => sw.includes(word) || word.includes(sw)));
      
      // If more than 20% of reference words are found, consider it a match
      if (commonWords.length / referenceWords.length > 0.2) {
        matches.push(index);
      }
    });

    return matches;
  };

  const renderHighlightedText = (sentences: string[], matchingIndices: number[], isReference: boolean = false) => {
    return (
      <div className="space-y-1">
        {sentences.map((sentence, index) => {
          const isHighlighted = hoveredSentenceIndex !== null && matchingIndices.includes(index);
          const isHovered = isReference && hoveredSentenceIndex === index;
          
          return (
            <span
              key={index}
              className={`inline-block transition-all duration-200 cursor-pointer ${
                isHighlighted || isHovered
                  ? 'bg-yellow-200 shadow-lg transform scale-105 rounded px-1'
                  : 'hover:bg-yellow-50'
              } ${isReference ? 'border-b border-dotted border-gray-300' : ''}`}
              onMouseEnter={() => isReference ? setHoveredSentenceIndex(index) : null}
              onMouseLeave={() => isReference ? setHoveredSentenceIndex(null) : null}
            >
              {sentence}{index < sentences.length - 1 ? ' ' : ''}
            </span>
          );
        })}
      </div>
    );
  };

  const matchingIndicesA = hoveredSentenceIndex !== null 
    ? findMatchingSentences(referenceSentences[hoveredSentenceIndex], conclusionASentences)
    : [];
  const matchingIndicesB = hoveredSentenceIndex !== null 
    ? findMatchingSentences(referenceSentences[hoveredSentenceIndex], conclusionBSentences)
    : [];

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
            {renderHighlightedText(referenceSentences, [], true)}
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
            <div className="text-gray-800 leading-relaxed">
              {renderHighlightedText(conclusionASentences, matchingIndicesA)}
            </div>
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
            <div className="text-gray-800 leading-relaxed">
              {renderHighlightedText(conclusionBSentences, matchingIndicesB)}
            </div>
          </CardContent>
        </Card>
      </div>

      {hoveredSentenceIndex !== null && (
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
