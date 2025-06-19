
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
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient<Database>(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('Starting block assignment process...')

    // Get all annotators with their block assignments
    const { data: annotators, error: annotatorsError } = await supabase
      .from('annotators')
      .select('*')
      .not('block_number', 'is', null)
      .order('block_number')

    if (annotatorsError) {
      console.error('Error fetching annotators:', annotatorsError)
      throw annotatorsError
    }

    console.log(`Found ${annotators?.length || 0} annotators with assigned blocks`)

    // Get all evaluations to analyze completion
    const { data: evaluations, error: evaluationsError } = await supabase
      .from('evaluations')
      .select('*')

    if (evaluationsError) {
      console.error('Error fetching evaluations:', evaluationsError)
      throw evaluationsError
    }

    console.log(`Found ${evaluations?.length || 0} total evaluations`)

    // Analyze block completion status
    const blockSize = 20
    const blockCompletionStatus = new Map<number, number>()

    // Count evaluations per annotator
    const evaluationsByAnnotator = new Map<string, number>()
    evaluations?.forEach(evaluation => {
      const count = evaluationsByAnnotator.get(evaluation.annotator_id) || 0
      evaluationsByAnnotator.set(evaluation.annotator_id, count + 1)
    })

    // Map annotators to their completion status
    annotators?.forEach(annotator => {
      if (annotator.block_number !== null) {
        const completedCount = evaluationsByAnnotator.get(annotator.id) || 0
        blockCompletionStatus.set(annotator.block_number, completedCount)
        console.log(`Block ${annotator.block_number}: ${completedCount}/${blockSize} completed (${annotator.email})`)
      }
    })

    // Find incomplete blocks (< 20 evaluations)
    const incompleteBlocks: number[] = []
    const completedBlocks: number[] = []

    blockCompletionStatus.forEach((count, blockNumber) => {
      if (count < blockSize) {
        incompleteBlocks.push(blockNumber)
      } else {
        completedBlocks.push(blockNumber)
      }
    })

    console.log(`Incomplete blocks: [${incompleteBlocks.join(', ')}]`)
    console.log(`Completed blocks: [${completedBlocks.join(', ')}]`)

    let nextBlockNumber: number

    if (incompleteBlocks.length > 0) {
      // Prioritize reassigning the lowest numbered incomplete block
      nextBlockNumber = Math.min(...incompleteBlocks)
      console.log(`Reassigning incomplete block: ${nextBlockNumber}`)
    } else {
      // All blocks are complete, assign next sequential block
      const maxAssignedBlock = annotators?.length > 0 
        ? Math.max(...annotators.map(a => a.block_number || 0))
        : -1
      nextBlockNumber = maxAssignedBlock + 1
      console.log(`Assigning new block: ${nextBlockNumber}`)
    }

    // Additional safety check: make sure we don't exceed reasonable limits
    // Assuming we have a finite number of evaluation tasks
    const maxPossibleBlocks = 50 // Adjust based on your total task count
    if (nextBlockNumber > maxPossibleBlocks) {
      console.log(`Reached maximum blocks limit (${maxPossibleBlocks})`)
      return new Response(
        JSON.stringify({ 
          error: 'All available task blocks have been assigned',
          nextBlockNumber: null 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        }
      )
    }

    console.log(`Selected block number: ${nextBlockNumber}`)

    return new Response(
      JSON.stringify({ 
        nextBlockNumber,
        isReassignment: incompleteBlocks.includes(nextBlockNumber),
        totalIncompleteBlocks: incompleteBlocks.length,
        blockCompletionStatus: Object.fromEntries(blockCompletionStatus)
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('Error in get-next-block function:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})
