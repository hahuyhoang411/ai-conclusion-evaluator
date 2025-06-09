import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const Introduction = () => {
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-xl font-bold">Introduction</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-gray-700">
        <p>
          This is a human evaluation task to compare the output from an AI-generated conclusion of a meta-analysis with the original meta-analysis.
        </p>
        <p>
          As an annotator, you will be provided with a <strong>Scoring Rubric (0-5 Scale)</strong> as a reference. You will see a <strong>Reference Conclusion</strong>, which is the original conclusion from the meta-analysis paper. Your task is to compare the reference conclusion with two AI-generated conclusions, labeled <strong>Conclusion A</strong> and <strong>Conclusion B</strong>, and score their similarity with the original conclusion.
        </p>
        <p>
          You can also expand the <strong>Source Abstracts</strong> to see the abstracts of the papers that the meta-analysis was based on. The estimated time to complete all tasks is around <strong>1 hour</strong>.
        </p>
        <p>
          Please note that you may see the same Reference Conclusion multiple times, but with different AI-generated conclusions.
        </p>
      </CardContent>
    </Card>
  );
};

export default Introduction; 