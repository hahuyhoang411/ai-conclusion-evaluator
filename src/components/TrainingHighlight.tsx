import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { HelpCircle } from 'lucide-react';
import { DetailedEvaluation, DetailedEvaluationItem } from '@/types/evaluation';

interface TrainingHighlightProps {
  referenceConclusion: string;
  conclusionA: string;
  conclusionB: string;
  correctScores: {
    modelA_score: number;
    modelB_score: number;
  };
  detailedEvaluation?: DetailedEvaluation;
}

const TrainingHighlight: React.FC<TrainingHighlightProps> = ({
  referenceConclusion,
  conclusionA,
  conclusionB,
  correctScores,
  detailedEvaluation,
}) => {
  const [hoveredSentenceIndex, setHoveredSentenceIndex] = useState<number | null>(null);
  const [hoveredEvaluation, setHoveredEvaluation] = useState<DetailedEvaluationItem | null>(null);

  const splitIntoSentences = (text: string): string[] => {
    const protectedText = text.replace(/(\d\.\d)/g, '###DECIMAL$1###');
    const sentences = protectedText
      .split(/(?<=[.!?])\s+(?=[A-Z])/)
      .map(s => s.trim())
      .filter(s => s.length > 0)
      .map(s => s.replace(/###DECIMAL(\d\.\d)###/g, '$1'));
    return sentences;
  };

  const referenceSentences = useMemo(() => splitIntoSentences(referenceConclusion), [referenceConclusion]);

  const escapeRegExp = (string: string) => {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  };

  const renderReferenceConclusion = () => {
    return (
      <div className="space-y-1">
        {referenceSentences.map((sentence, index) => (
          <span
            key={index}
            className={`inline-block transition-all duration-200 cursor-pointer hover:bg-yellow-50 ${
              hoveredSentenceIndex === index ? 'bg-yellow-200 shadow-lg transform scale-105 rounded px-1' : ''
            } border-b border-dotted border-gray-300`}
            onMouseEnter={() => setHoveredSentenceIndex(index)}
            onMouseLeave={() => setHoveredSentenceIndex(null)}
          >
            {sentence}{index < referenceSentences.length - 1 ? ' ' : ''}
          </span>
        ))}
      </div>
    );
  };

  const renderConclusion = (conclusion: string, evaluationItems?: DetailedEvaluationItem[]) => {
    const cleanedConclusion = conclusion.replace(/\*\*Primary Concluding Statement:\*\*\s*\n*/, '');

    if (hoveredSentenceIndex === null || !evaluationItems) {
      return <div>{cleanedConclusion}</div>;
    }

    const relevantEvals = evaluationItems.filter(item => item.ref_sentence_index === hoveredSentenceIndex);
    if (relevantEvals.length === 0) {
      return <div>{cleanedConclusion}</div>;
    }

    const highlighInfo = relevantEvals[0];
    const textToFind = highlighInfo.conclusion_text.trim();

    if (!textToFind || textToFind.startsWith('(')) {
        return <div>{cleanedConclusion}</div>;
    }

    let matchToHighlight = '';
    if (textToFind.includes('[…]')) {
        const patternParts = textToFind.split('[…]').map(part => escapeRegExp(part.trim()));
        const regexPattern = new RegExp(patternParts.join('(.*?)'), 'i');
        const match = cleanedConclusion.match(regexPattern);
        if (match) {
            matchToHighlight = match[0];
        }
    } else {
        const regexPattern = new RegExp(escapeRegExp(textToFind), 'i');
        const match = cleanedConclusion.match(regexPattern);
        if (match) {
            matchToHighlight = match[0];
        }
    }

    return (
      <div onMouseEnter={() => setHoveredEvaluation(highlighInfo)} onMouseLeave={() => setHoveredEvaluation(null)}>
        {matchToHighlight ? (
          cleanedConclusion.split(new RegExp(`(${escapeRegExp(matchToHighlight)})`, 'gi')).map((part, index) =>
            part.toLowerCase() === matchToHighlight.toLowerCase() ? (
              <span key={index} className="bg-yellow-200 shadow-lg transform scale-105 rounded px-1">
                {part}
              </span>
            ) : (
              <span key={index}>{part}</span>
            )
          )
        ) : (
          cleanedConclusion
        )}
      </div>
    );
  };

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
            {renderReferenceConclusion()}
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
              {renderConclusion(conclusionA, detailedEvaluation?.conclusionA)}
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
              {renderConclusion(conclusionB, detailedEvaluation?.conclusionB)}
            </div>
          </CardContent>
        </Card>
      </div>

      {hoveredEvaluation && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <p className="text-sm text-amber-800">
            <strong>Highlighting reason:</strong> (Score: {hoveredEvaluation.score}) {hoveredEvaluation.reason}
          </p>
        </div>
      )}
    </div>
  );
};

export default TrainingHighlight;
