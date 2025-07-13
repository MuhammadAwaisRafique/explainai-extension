/*
# Create explanations table

1. New Tables
   - `explanations`
     - `id` (uuid, primary key)
     - `user_id` (uuid, foreign key to auth.users)
     - `original_text` (text, the highlighted text)
     - `explanation` (text, the AI-generated explanation)
     - `context` (text, webpage context)
     - `is_fallback` (boolean, indicates if fallback explanation was used)
     - `ai_provider` (text, indicates which AI service was used: gemini, openai, fallback)
     - `created_at` (timestamp)
     - `updated_at` (timestamp)

2. Security
   - Enable RLS on `explanations` table
   - Add policy for authenticated users to manage their own explanations
   - Add policy for authenticated users to read their own explanations
   - Add policy for authenticated users to delete their own explanations

3. Indexes
   - Add index on user_id for faster queries
   - Add index on created_at for sorting
*/

CREATE TABLE IF NOT EXISTS explanations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  original_text text NOT NULL,
  explanation text NOT NULL,
  context text DEFAULT '',
  is_fallback boolean DEFAULT false,
  ai_provider text DEFAULT 'gemini',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE explanations ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can insert their own explanations"
  ON explanations
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read their own explanations"
  ON explanations
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own explanations"
  ON explanations
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own explanations"
  ON explanations
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_explanations_user_id ON explanations(user_id);
CREATE INDEX IF NOT EXISTS idx_explanations_created_at ON explanations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_explanations_user_created ON explanations(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_explanations_is_fallback ON explanations(is_fallback);
CREATE INDEX IF NOT EXISTS idx_explanations_ai_provider ON explanations(ai_provider);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_explanations_updated_at
  BEFORE UPDATE ON explanations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();