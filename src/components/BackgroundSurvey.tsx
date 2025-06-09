
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface BackgroundSurveyProps {
  onComplete: () => void;
}

const BackgroundSurvey: React.FC<BackgroundSurveyProps> = ({ onComplete }) => {
  const [background, setBackground] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!background) {
      toast.error('Please select your background');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('annotators')
        .update({ expertise_group: background })
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id);

      if (error) throw error;

      toast.success('Background information saved');
      onComplete();
    } catch (error) {
      toast.error('Failed to save background information');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-gray-900">
            Background Information
          </CardTitle>
          <CardDescription className="text-gray-600">
            Please tell us about your professional or academic background
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <p className="text-lg font-medium text-gray-900 mb-4">
                What is your professional or academic background?
              </p>
              <RadioGroup 
                value={background} 
                onValueChange={setBackground}
                className="space-y-3"
              >
                <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50">
                  <RadioGroupItem value="medical" id="medical" />
                  <Label htmlFor="medical" className="flex-1 cursor-pointer">
                    Medical / Biology / Life Sciences (e.g., doctor, researcher, student in the field)
                  </Label>
                </div>
                <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50">
                  <RadioGroupItem value="general" id="general" />
                  <Label htmlFor="general" className="flex-1 cursor-pointer">
                    General / Other
                  </Label>
                </div>
              </RadioGroup>
            </div>
            <Button 
              type="submit" 
              className="w-full" 
              disabled={loading || !background}
            >
              {loading ? 'Saving...' : 'Continue to Evaluation'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default BackgroundSurvey;
