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

  // Get score color based on exact score value
  const getScoreColor = (score: number) => {
    if (score === 5) return 'bg-green-200 border-green-400 text-green-800';
    if (score === 4) return 'bg-blue-200 border-blue-400 text-blue-800';
    if (score === 3) return 'bg-yellow-200 border-yellow-400 text-yellow-800';
    if (score === 2) return 'bg-orange-200 border-orange-400 text-orange-800';
    if (score === 1) return 'bg-red-200 border-red-400 text-red-800';
    return 'bg-gray-300 border-gray-500 text-gray-700'; // score 0
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
            Scoring Rubric (0-5 Scale)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex items-start gap-2">
              <div className="w-6 h-6 bg-green-200 border border-green-400 rounded flex items-center justify-center text-xs font-bold text-green-800">5</div>
              <div>
                <span className="font-semibold text-green-700">Excellent Similarity / Semantically Equivalent</span>
                <p className="text-xs text-gray-600 mt-1">Accurately captures all main findings, key specifics, essential nuance/caveats, and core implications/future directions from the original.</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-6 h-6 bg-blue-200 border border-blue-400 rounded flex items-center justify-center text-xs font-bold text-blue-800">4</div>
              <div>
                <span className="font-semibold text-blue-700">High Similarity / Mostly Equivalent</span>
                <p className="text-xs text-gray-600 mt-1">Accurately captures the main findings and most key specifics. May miss minor details, some nuance/caveats, or less critical implications.</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-6 h-6 bg-yellow-200 border border-yellow-400 rounded flex items-center justify-center text-xs font-bold text-yellow-800">3</div>
              <div>
                <span className="font-semibold text-yellow-700">Moderate Similarity / Partially Equivalent</span>
                <p className="text-xs text-gray-600 mt-1">Captures the main finding(s) correctly but misses significant supporting details, comparisons, nuance, limitations, or implications mentioned in the original.</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-6 h-6 bg-orange-200 border border-orange-400 rounded flex items-center justify-center text-xs font-bold text-orange-800">2</div>
              <div>
                <span className="font-semibold text-orange-700">Low Similarity / Superficially Related</span>
                <p className="text-xs text-gray-600 mt-1">Captures *some* element related to the topic but misrepresents the main finding(s) or omits crucial information necessary to understand the original conclusion's core message.</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-6 h-6 bg-red-200 border border-red-400 rounded flex items-center justify-center text-xs font-bold text-red-800">1</div>
              <div>
                <span className="font-semibold text-red-700">Very Low Similarity / Barely Related</span>
                <p className="text-xs text-gray-600 mt-1">Mentions the same general topic but the stated conclusions are substantially different, contradictory in parts, or completely miss the scope and findings of the original.</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-6 h-6 bg-gray-300 border border-gray-500 rounded flex items-center justify-center text-xs font-bold text-gray-700">0</div>
              <div>
                <span className="font-semibold text-gray-700">No Similarity / Contradictory or Irrelevant</span>
                <p className="text-xs text-gray-600 mt-1">The generated conclusion is on a completely different topic, directly contradicts the main findings of the original, or is nonsensical/irrelevant.</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TrainingHighlight;
