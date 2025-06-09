import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

type Expertise = 'medical' | 'general';

interface BackgroundSurveyProps {
  onSubmit: (expertise: Expertise) => void;
  // Consider passing down a loading state from the hook if needed
}

const BackgroundSurvey: React.FC<BackgroundSurveyProps> = ({ onSubmit }) => {
  const [selectedBackground, setSelectedBackground] = useState<Expertise | ''>('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!selectedBackground) {
      toast.error('Please select your background');
      return;
    }
    setLoading(true);
    // The actual submission logic is now in the useEvaluator hook
    await onSubmit(selectedBackground);
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">
            Background Information
          </CardTitle>
          <p className="text-gray-600 text-center">
            Please tell us about your professional or academic background to help us analyze the results.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label className="text-lg font-medium mb-4 block">
              What is your professional or academic background?
            </Label>
            <RadioGroup value={selectedBackground} onValueChange={(value) => setSelectedBackground(value as Expertise)}>
              <div className="flex items-center space-x-2 p-4 border rounded-lg hover:bg-gray-50">
                <RadioGroupItem value="medical" id="medical" />
                <Label htmlFor="medical" className="cursor-pointer flex-1">
                  Medical / Biology / Life Sciences (e.g., doctor, researcher, student in the field)
                </Label>
              </div>
              <div className="flex items-center space-x-2 p-4 border rounded-lg hover:bg-gray-50">
                <RadioGroupItem value="general" id="general" />
                <Label htmlFor="general" className="cursor-pointer flex-1">
                  General / Other
                </Label>
              </div>
            </RadioGroup>
          </div>
          
          <Button 
            onClick={handleSubmit} 
            disabled={!selectedBackground || loading}
            className="w-full"
          >
            {loading ? 'Saving...' : 'Continue to Evaluation'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default BackgroundSurvey;
