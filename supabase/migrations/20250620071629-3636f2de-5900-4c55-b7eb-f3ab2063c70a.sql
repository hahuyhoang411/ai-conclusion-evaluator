
-- First, let's create RLS policies that allow the edge function to query data safely
-- We need to allow the service role to read annotators and evaluations data

-- Policy for annotators table - allow service role to read all annotators
CREATE POLICY "Service role can read all annotators" 
ON public.annotators 
FOR SELECT 
TO service_role 
USING (true);

-- Policy for evaluations table - allow service role to read all evaluations  
CREATE POLICY "Service role can read all evaluations"
ON public.evaluations 
FOR SELECT 
TO service_role 
USING (true);

-- Policy for annotators table - allow service role to update block assignments
CREATE POLICY "Service role can update annotator blocks"
ON public.annotators 
FOR UPDATE 
TO service_role 
USING (true);
