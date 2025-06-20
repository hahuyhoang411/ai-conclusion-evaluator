
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface Database {
  public: {
    Tables: {
      annotators: {
        Row: {
          id: string
          email: string | null
          expertise_group: string | null
          created_at: string
          block_number: number | null
        }
        Insert: {
          id?: string
          email?: string | null
          expertise_group?: string | null
          created_at?: string
          block_number?: number | null
        }
        Update: {
          id?: string
          email?: string | null
          expertise_group?: string | null
          created_at?: string
          block_number?: number | null
        }
      }
      evaluations: {
        Row: {
          id: number
          annotator_id: string
          task_id: number | null
          score_a: number | null
          score_b: number | null
          session_start_time: string | null
          evaluation_end_time: string | null
          created_at: string
        }
      }
    }
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient<Database>(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('Starting get-next-block function');

    // Step 1: Find incomplete blocks (blocks with < 20 evaluations)
    const { data: incompleteBlocks, error: incompleteError } = await supabaseClient
      .rpc('get_incomplete_blocks')

    if (incompleteError) {
      console.error('Error checking incomplete blocks:', incompleteError);
      // If the function doesn't exist yet, we'll continue with the manual approach
    }

    let targetBlockNumber: number;

    if (incompleteBlocks && incompleteBlocks.length > 0) {
      // Assign the first incomplete block
      targetBlockNumber = incompleteBlocks[0].block_number;
      console.log(`Found incomplete block: ${targetBlockNumber}`);
    } else {
      // Step 2: Find the highest assigned block number
      const { data: maxBlockData, error: maxBlockError } = await supabaseClient
        .from('annotators')
        .select('block_number')
        .not('block_number', 'is', null)
        .order('block_number', { ascending: false })
        .limit(1);

      if (maxBlockError) {
        console.error('Error finding max block:', maxBlockError);
        throw new Error('Failed to determine next block number');
      }

      console.log('Max block data:', maxBlockData);

      if (!maxBlockData || maxBlockData.length === 0) {
        // No blocks assigned yet, start with block 0
        targetBlockNumber = 0;
        console.log('No blocks assigned yet, starting with block 0');
      } else {
        const maxBlock = maxBlockData[0].block_number;
        
        // Step 3: Check if the max block is complete (has 20 evaluations)
        const { data: maxBlockEvaluations, error: evalError } = await supabaseClient
          .from('evaluations')
          .select('id', { count: 'exact' })
          .in('annotator_id', 
            await supabaseClient
              .from('annotators')
              .select('id')
              .eq('block_number', maxBlock)
              .then(result => result.data?.map(a => a.id) || [])
          );

        if (evalError) {
          console.error('Error checking block completeness:', evalError);
          throw new Error('Failed to check block completeness');
        }

        const evaluationCount = maxBlockEvaluations?.length || 0;
        console.log(`Block ${maxBlock} has ${evaluationCount} evaluations`);

        if (evaluationCount >= 20) {
          // Max block is complete, assign next block
          targetBlockNumber = (maxBlock || 0) + 1;
          console.log(`Block ${maxBlock} is complete, assigning new block: ${targetBlockNumber}`);
        } else {
          // Max block is incomplete, assign it
          targetBlockNumber = maxBlock || 0;
          console.log(`Block ${maxBlock} is incomplete, reassigning it: ${targetBlockNumber}`);
        }
      }
    }

    console.log(`Final target block number: ${targetBlockNumber}`);

    return new Response(
      JSON.stringify({ 
        nextBlockNumber: targetBlockNumber,
        message: `Assigned block ${targetBlockNumber}`
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error) {
    console.error('Error in get-next-block function:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to get next block number',
        details: error.message 
      }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
});
