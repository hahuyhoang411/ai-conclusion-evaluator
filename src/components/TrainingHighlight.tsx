import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { HelpCircle } from 'lucide-react';
import { SentenceMapping } from '@/types/evaluation';

interface TrainingHighlightProps {
  referenceConclusion: string;
  conclusionA: string;
  conclusionB: string;
  correctScores: {
    modelA_score: number;
    modelB_score: number;
  };
  sentenceMappings?: SentenceMapping[];
}

const TrainingHighlight: React.FC<TrainingHighlightProps> = ({
  referenceConclusion,
  conclusionA,
  conclusionB,
  correctScores,
  sentenceMappings = []
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

  // Get score color based on score value
  const getScoreColor = (score: number) => {
    if (score >= 4.5) return 'bg-green-200 border-green-400 text-green-800';
    if (score >= 3.5) return 'bg-blue-200 border-blue-400 text-blue-800';
    if (score >= 2.5) return 'bg-yellow-200 border-yellow-400 text-yellow-800';
    if (score >= 1.5) return 'bg-orange-200 border-orange-400 text-orange-800';
    return 'bg-red-200 border-red-400 text-red-800';
  };

  // Render text with highlighted phrases using exact phrase matching
  const renderTextWithHighlights = (
    text: string, 
    mappings: Array<{ phrase: string; score: number; explanation: string }>,
    isActive: boolean
  ) => {
    if (!isActive || mappings.length === 0) {
      return <span>{text}</span>;
    }

    let result = text;
    const highlightedParts: Array<{ phrase: string; score: number; explanation: string; index: number }> = [];

    // Find all phrase occurrences
    mappings.forEach(mapping => {
      const { phrase, score, explanation } = mapping;
      const index = result.toLowerCase().indexOf(phrase.toLowerCase());
      
      if (index !== -1) {
        highlightedParts.push({ phrase, score, explanation, index });
      }
    });

    // Sort by index to handle them in order
    highlightedParts.sort((a, b) => a.index - b.index);

    if (highlightedParts.length === 0) {
      return <span>{text}</span>;
    }

    const parts: React.ReactNode[] = [];
    let lastIndex = 0;

    highlightedParts.forEach((part, idx) => {
      const { phrase, score, explanation, index } = part;
      const endIndex = index + phrase.length;
      
      // Add text before highlight
      if (index > lastIndex) {
        parts.push(
          <span key={`text-${idx}`}>
            {text.slice(lastIndex, index)}
          </span>
        );
      }

      // Add highlighted phrase with tooltip
      parts.push(
        <TooltipProvider key={`highlight-${idx}`}>
          <Tooltip>
            <TooltipTrigger asChild>
              <span 
                className={`${getScoreColor(score)} px-1 py-0.5 rounded border-2 cursor-help transition-all duration-200 hover:shadow-lg`}
              >
                {text.slice(index, endIndex)}
              </span>
            </TooltipTrigger>
            <TooltipContent>
              <div className="max-w-xs">
                <div className="font-semibold">Score: {score}/5</div>
                <div className="text-sm mt-1">{explanation}</div>
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );

      lastIndex = endIndex;
    });

    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(
        <span key="text-end">
          {text.slice(lastIndex)}
        </span>
      );
    }

    return <>{parts}</>;
  };

  // Get mappings for a specific sentence and conclusion
  const getMappingsForConclusion = (sentenceIndex: number, conclusion: 'A' | 'B') => {
    const mapping = sentenceMappings.find(m => m.referenceSentenceIndex === sentenceIndex);
    if (!mapping) return [];
    
    const phraseMapping = conclusion === 'A' ? mapping.conclusionA : mapping.conclusionB;
    if (!phraseMapping) return [];
    
    return [phraseMapping];
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
                    Hover over sentences in this reference to see which specific phrases in the generated conclusions match. 
                    Highlighted phrases show their individual scores and explanations.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-gray-800 leading-relaxed space-y-2">
            {referenceSentences.map((sentence, index) => (
              <div
                key={index}
                className={`inline-block cursor-pointer transition-all duration-200 p-1 rounded ${
                  hoveredSentenceIndex === index
                    ? 'bg-blue-100 shadow-md'
                    : 'hover:bg-blue-50'
                }`}
                onMouseEnter={() => setHoveredSentenceIndex(index)}
                onMouseLeave={() => setHoveredSentenceIndex(null)}
              >
                <span className="text-sm text-blue-600 font-medium mr-2">
                  [{index + 1}]
                </span>
                {sentence}
                {index < referenceSentences.length - 1 && ' '}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Side-by-Side Conclusions */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Conclusion A */}
        <Card className="border-green-200">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-green-700">
              Conclusion 1 (Overall Score: {correctScores.modelA_score.toFixed(1)})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-gray-800 leading-relaxed">
              {renderTextWithHighlights(
                conclusionA,
                hoveredSentenceIndex !== null ? getMappingsForConclusion(hoveredSentenceIndex, 'A') : [],
                hoveredSentenceIndex !== null
              )}
            </div>
          </CardContent>
        </Card>

        {/* Conclusion B */}
        <Card className="border-purple-200">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-purple-700">
              Conclusion 2 (Overall Score: {correctScores.modelB_score.toFixed(1)})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-gray-800 leading-relaxed">
              {renderTextWithHighlights(
                conclusionB,
                hoveredSentenceIndex !== null ? getMappingsForConclusion(hoveredSentenceIndex, 'B') : [],
                hoveredSentenceIndex !== null
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Score Legend */}
      <Card className="bg-gray-50 border-gray-200">
        <CardHeader>
          <CardTitle className="text-sm font-semibold text-gray-700">
            Score Legend
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 bg-green-200 border border-green-400 rounded"></div>
              <span>5-4.5: Excellent</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 bg-blue-200 border border-blue-400 rounded"></div>
              <span>4.4-3.5: High</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 bg-yellow-200 border border-yellow-400 rounded"></div>
              <span>3.4-2.5: Moderate</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 bg-orange-200 border border-orange-400 rounded"></div>
              <span>2.4-1.5: Low</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 bg-red-200 border border-red-400 rounded"></div>
              <span>1.4-0: Very Low</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TrainingHighlight;
