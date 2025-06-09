
# Human Evaluation Study Application

A comprehensive web application for conducting human evaluation studies on AI-generated text quality. This application allows researchers to crowdsource judgments comparing AI-generated conclusions against reference standards.

## Features

- **Magic Link Authentication**: Passwordless login system using Supabase Auth
- **Background Survey**: One-time user categorization (Medical/General background)
- **Comprehensive Evaluation Interface**: 
  - Progress tracking
  - Interactive scoring rubric (0-5 scale)
  - Side-by-side comparison of AI conclusions
  - Toggleable source abstracts
  - Real-time data persistence
- **Complete User Flow**: From authentication to completion with thank-you page

## Technology Stack

- **Frontend**: React with TypeScript and Vite
- **Styling**: Tailwind CSS with shadcn/ui components
- **Backend**: Supabase (Database + Authentication)
- **Data Storage**: PostgreSQL with Row Level Security (RLS)

## Project Structure

```
src/
├── components/
│   ├── ui/                     # shadcn/ui components
│   ├── AuthPage.tsx           # Magic link authentication
│   ├── BackgroundSurvey.tsx   # User background questionnaire
│   ├── CompletionPage.tsx     # Thank you/completion page
│   ├── EvaluationApp.tsx      # Main evaluation orchestrator
│   ├── ScoringRubric.tsx      # Interactive scoring criteria
│   └── TaskEvaluation.tsx     # Individual task evaluation interface
├── hooks/
│   └── useAuth.tsx            # Authentication state management
├── types/
│   └── evaluation.ts          # TypeScript type definitions
├── pages/
│   └── Index.tsx              # Main page router
└── integrations/
    └── supabase/              # Supabase client configuration
public/
└── tasks.json                 # Evaluation tasks data
```

## Setup Instructions

### Prerequisites

- Node.js (v18+ recommended)
- npm or yarn package manager
- Supabase account and project

### 1. Clone and Install

```bash
git clone <repository-url>
cd human-evaluation-app
npm install
```

### 2. Environment Configuration

Create a `.env.local` file in the root directory:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Replace the values with your actual Supabase project credentials found in your Supabase dashboard under Settings > API.

### 3. Database Setup

The application requires two main tables in your Supabase database:

#### Annotators Table
```sql
CREATE TABLE public.annotators (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  email TEXT,
  expertise_group TEXT CHECK (expertise_group IN ('medical', 'general')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(id)
);
```

#### Evaluations Table
```sql
CREATE TABLE public.evaluations (
  id BIGSERIAL PRIMARY KEY,
  annotator_id UUID REFERENCES public.annotators(id) ON DELETE CASCADE NOT NULL,
  task_id BIGINT NOT NULL,
  score_a SMALLINT CHECK (score_a >= 0 AND score_a <= 5),
  score_b SMALLINT CHECK (score_b >= 0 AND score_b <= 5),
  session_start_time TIMESTAMP WITHOUT TIME ZONE,
  evaluation_end_time TIMESTAMP WITHOUT TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
```

Enable Row Level Security (RLS) and create appropriate policies for both tables to ensure users can only access their own data.

### 4. Supabase Authentication Configuration

1. In your Supabase dashboard, go to Authentication > Settings
2. Enable "Enable email confirmations" (optional, but recommended for production)
3. Configure email templates if desired
4. Add your domain to "Site URL" in Auth settings

### 5. Run the Application

```bash
npm run dev
```

The application will be available at `http://localhost:5173`

## How to Add/Modify Tasks

Tasks are defined in the `public/tasks.json` file. Each task follows this structure:

```json
{
  "taskId": 1,
  "sourceAbstracts": [
    "Abstract text 1...",
    "Abstract text 2...",
    "Abstract text 3..."
  ],
  "referenceConclusion": "The gold standard conclusion text...",
  "modelOutputs": {
    "conclusionA": "First AI-generated conclusion...",
    "conclusionB": "Second AI-generated conclusion..."
  }
}
```

### To add new tasks:

1. Open `public/tasks.json`
2. Add new task objects to the array
3. Ensure each task has a unique `taskId`
4. Include all required fields
5. Save the file - changes will be reflected immediately

### Task Guidelines:

- **taskId**: Must be unique integers
- **sourceAbstracts**: Array of source material (abstracts, papers, etc.)
- **referenceConclusion**: The "gold standard" conclusion to compare against
- **modelOutputs**: Object containing exactly two conclusions (A and B) to evaluate

## Scoring System

The application uses a 0-5 Likert scale based on semantic similarity:

- **5**: Excellent Similarity / Semantically Equivalent
- **4**: High Similarity / Mostly Equivalent  
- **3**: Moderate Similarity / Partially Equivalent
- **2**: Low Similarity / Superficially Related
- **1**: Very Low Similarity / Barely Related
- **0**: No Similarity / Contradictory or Irrelevant

## Data Export

Evaluation results are stored in the `evaluations` table and can be exported via:

1. Supabase dashboard SQL editor
2. API queries using the Supabase client
3. Direct database access

Example query to export all evaluations:
```sql
SELECT 
  e.*,
  a.expertise_group,
  a.email
FROM evaluations e
JOIN annotators a ON e.annotator_id = a.id
ORDER BY e.created_at;
```

## Deployment

This application can be deployed to any static hosting service (Vercel, Netlify, etc.) since it's a client-side React application that communicates with Supabase.

### For Vercel:
```bash
npm run build
npx vercel --prod
```

### For Netlify:
```bash
npm run build
# Upload dist/ folder to Netlify
```

Make sure to configure environment variables in your hosting platform's dashboard.

## Support

For issues or questions:
1. Check the browser console for error messages
2. Verify Supabase connection and RLS policies
3. Ensure all environment variables are properly set
4. Check that tasks.json is properly formatted

## License

This project is licensed under the MIT License.
