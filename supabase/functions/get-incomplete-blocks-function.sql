
-- This function will be created via the Supabase dashboard SQL editor
-- It finds blocks that have been assigned but have fewer than 20 evaluations

CREATE OR REPLACE FUNCTION get_incomplete_blocks()
RETURNS TABLE(block_number integer, evaluation_count bigint) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.block_number,
    COUNT(e.id) as evaluation_count
  FROM annotators a
  LEFT JOIN evaluations e ON a.id = e.annotator_id
  WHERE a.block_number IS NOT NULL
  GROUP BY a.block_number
  HAVING COUNT(e.id) < 20
  ORDER BY a.block_number ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
