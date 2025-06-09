
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const ScoringRubric = () => {
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Scoring Rubric (0-5 Scale)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div>
          <span className="font-semibold text-green-700">5: Excellent Similarity / Semantically Equivalent</span>
          <p className="text-gray-700 mt-1">
            Accurately captures all main findings, key specifics, essential nuance/caveats, and core implications/future directions from the original.
            Minor differences in wording are acceptable if the meaning is preserved entirely. Conveys the same overall message and takeaway points. Includes safety aspects if mentioned in the original.
            Essentially, a reader would draw the exact same conclusions from both texts regarding the study's outcome and significance.
          </p>
        </div>
        
        <div>
          <span className="font-semibold text-blue-700">4: High Similarity / Mostly Equivalent</span>
          <p className="text-gray-700 mt-1">
            Accurately captures the main findings and most key specifics.
            May miss minor details, some nuance/caveats, or less critical implications OR phrase them slightly differently but without changing the core meaning.
            The primary takeaway message is the same.
          </p>
        </div>
        
        <div>
          <span className="font-semibold text-yellow-700">3: Moderate Similarity / Partially Equivalent</span>
          <p className="text-gray-700 mt-1">
            Captures the main finding(s) correctly but misses significant supporting details, comparisons, nuance, limitations, or implications mentioned in the original.
            OR captures most elements but introduces a minor inaccuracy or misrepresentation that slightly alters the emphasis or completeness.
            A reader gets the general gist but misses important context or qualifications present in the original.
          </p>
        </div>
        
        <div>
          <span className="font-semibold text-orange-700">2: Low Similarity / Superficially Related</span>
          <p className="text-gray-700 mt-1">
            Captures *some* element related to the topic but misrepresents the main finding(s) or omits crucial information necessary to understand the original conclusion's core message.
            OR focuses on a minor point from the original while ignoring the central conclusion.
            There's a connection, but the essential meaning differs significantly.
          </p>
        </div>
        
        <div>
          <span className="font-semibold text-red-700">1: Very Low Similarity / Barely Related</span>
          <p className="text-gray-700 mt-1">
            Mentions the same general topic but the stated conclusions are substantially different, contradictory in parts, or completely miss the scope and findings of the original.
            Fails to capture almost all key evaluation criteria accurately.
          </p>
        </div>
        
        <div>
          <span className="font-semibold text-red-900">0: No Similarity / Contradictory or Irrelevant</span>
          <p className="text-gray-700 mt-1">
            The generated conclusion is on a completely different topic, directly contradicts the main findings of the original, or is nonsensical/irrelevant.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default ScoringRubric;
