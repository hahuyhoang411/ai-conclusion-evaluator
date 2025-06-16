import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

const AuthPage = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasCommitted, setHasCommitted] = useState(false);
  const { signInWithMagicLink } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error('Please enter your email address');
      return;
    }

    setLoading(true);
    const { error } = await signInWithMagicLink(email);
    
    if (error) {
      toast.error('Failed to send magic link: ' + error.message);
    } else {
      toast.success('Check your email for the magic link!');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-gray-900">
            Human Evaluation Study
          </CardTitle>
          <CardDescription className="text-gray-600">
            Enter your email to begin the evaluation process
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Input
                type="email"
                placeholder="Enter your email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox id="commitment" checked={hasCommitted} onCheckedChange={(checked) => setHasCommitted(checked as boolean)} />
              <Label htmlFor="commitment" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                I commit to finishing all assigned evaluation tasks to the best of my ability.
              </Label>
            </div>
            <Button 
              type="submit" 
              className="w-full" 
              disabled={loading || !hasCommitted}
            >
              {loading ? 'Sending...' : 'Begin Evaluation'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default AuthPage;
