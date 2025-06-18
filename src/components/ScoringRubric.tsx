
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const ScoringRubric = () => {
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Evaluation Instructions & Scoring Rubric</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6 text-sm">
        {/* Core Task Section */}
        <div>
          <h3 className="font-semibold text-lg text-gray-900 mb-3">Core Task</h3>
          <p className="text-gray-700">
            Evaluate the <strong>Generated Conclusion</strong> based on its semantic alignment and completeness compared to the <strong>Original Conclusion</strong>. Assign a similarity score from 0 to 5 using the detailed rubric below. Provide a structured justification for your score, referencing specific aspects of the comparison.
          </p>
        </div>

        {/* Evaluation Criteria Section */}
        <div>
          <h3 className="font-semibold text-lg text-gray-900 mb-3">Evaluation Criteria</h3>
          <p className="text-gray-700 mb-4">
            Focus on the <strong>semantic meaning and the core components</strong> typically found in meta-analysis conclusions. Evaluate the Generated Conclusion's alignment with the Original Conclusion across these dimensions:
          </p>
          
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold text-blue-800 mb-2">1. Main Finding(s) / Overall Result:</h4>
              <ul className="list-disc list-inside text-gray-700 space-y-1 ml-4">
                <li>Does it accurately capture the primary outcome(s) or effect(s) reported in the original? (e.g., treatment effectiveness, diagnostic accuracy, association strength, lack of effect).</li>
                <li>Does it reflect the direction and magnitude (if specified qualitatively or quantitatively) of the main finding(s)? (e.g., "significantly reduced LDL-C", "did not reduce mortality", "better clinical outcomes").</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-blue-800 mb-2">2. Key Specifics & Comparisons:</h4>
              <ul className="list-disc list-inside text-gray-700 space-y-1 ml-4">
                <li>Does it mention the specific interventions, populations, or contexts discussed in the original? (e.g., "short-acting beta-blockers in septic patients", "pitavastatin at 1 mg, 2 mg, 4 mg", "ML based on high-resolution CT", "ACLR with ALLR").</li>
                <li>Does it include crucial comparisons highlighted in the original? (e.g., dose comparisons, comparison to other treatments/methods like "compared to isolated ACLR", "compared to less commonly used statins").</li>
                <li>Does it capture key quantitative results if present and central to the original conclusion? (e.g., "% reduction", specific sensitivity/specificity levels if mentioned).</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-blue-800 mb-2">3. Nuance, Caveats, and Limitations:</h4>
              <ul className="list-disc list-inside text-gray-700 space-y-1 ml-4">
                <li>Does it reflect any major limitations, caveats, or calls for caution mentioned in the original? (e.g., "high heterogeneity", "interpret with caution", "further research needed", "remains uncertain", need for "multicenter clinical trials").</li>
                <li>Does it capture the level of certainty or confidence expressed in the original?</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-blue-800 mb-2">4. Implications & Future Directions:</h4>
              <ul className="list-disc list-inside text-gray-700 space-y-1 ml-4">
                <li>Does it reflect the key clinical implications, significance, or recommendations for future research stated in the original? (e.g., "provide new insights into targeted treatment", "potential of AI-based tools", "support an individualized approach", "serve as a foundation for incorporation into clinical practice").</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-blue-800 mb-2">5. Safety/Tolerability (if applicable):</h4>
              <ul className="list-disc list-inside text-gray-700 space-y-1 ml-4">
                <li>If the original conclusion addresses safety, adverse effects, or tolerability, does the generated conclusion accurately reflect this aspect? (e.g., "well tolerated and safe", "low incidence of myalgia", "increases in liver enzymes").</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-blue-800 mb-2">6. Overall Semantic Equivalence:</h4>
              <ul className="list-disc list-inside text-gray-700 space-y-1 ml-4">
                <li>Considering all the above, does the generated conclusion convey the same core message and essential details as the original, even if the wording differs?</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Scoring Scale Section */}
        <div>
          <h3 className="font-semibold text-lg text-gray-900 mb-3">Scoring Rubric (0-5 Scale)</h3>
          <div className="space-y-4">
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
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ScoringRubric;
