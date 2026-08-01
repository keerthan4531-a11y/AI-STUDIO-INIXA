export interface BattleChallenge {
  id: string;
  title: string;
  category: 'text-research' | 'coding';
  difficulty: 'Easy' | 'Medium' | 'Hard' | 'Extreme';
  timeLimitSeconds: number;
  description: string;
  targetOutputOrGoal: string;
  constraints: string[];
  sampleInput?: string;
  evaluationCriteria: string;
}

export const BATTLE_CHALLENGES: BattleChallenge[] = [
  // TEXT RESEARCH CHALLENGES
  {
    id: 'tr-1',
    title: 'Unstructured Data to Typed JSON',
    category: 'text-research',
    difficulty: 'Medium',
    timeLimitSeconds: 240,
    description: 'You are provided with a messy support transcript. Write a prompt to extract key metadata (User, Issue Severity, Operating System, Root Cause, Action Items) into pure valid JSON without markdown wrapping or extra conversational fluff.',
    sampleInput: `Transcript: Customer John Doe (ID 9842) called at 10:15 AM complaining that the desktop app on Windows 11 keeps crashing whenever he uploads a file > 50MB. Agent investigated and found a buffer overflow in the upload streaming service. Recommending patch v2.4.1 deployment by end of day.`,
    targetOutputOrGoal: `{\n  "userId": 9842,\n  "customerName": "John Doe",\n  "os": "Windows 11",\n  "severity": "HIGH",\n  "rootCause": "Buffer overflow in upload streaming service",\n  "recommendedFix": "Deploy patch v2.4.1"\n}`,
    constraints: [
      'Output MUST be 100% valid JSON',
      'No markdown ```json fences allowed in response',
      'No polite intro/outro text (e.g. "Here is your JSON:")'
    ],
    evaluationCriteria: 'Strict JSON schema compliance, key accuracy, and zero conversational filler.'
  },
  {
    id: 'tr-2',
    title: 'Zero-Hallucination Academic Extraction',
    category: 'text-research',
    difficulty: 'Hard',
    timeLimitSeconds: 300,
    description: 'Extract exact quantitative findings from a complex research snippet into a markdown table. Your prompt must prevent the model from inferring or adding any numbers not explicitly stated.',
    sampleInput: `Study Results: Group A (n=120) showed a 34.2% increase in retention after 6 weeks of micro-learning. Group B (n=115) control group showed 4.1% increase. P-value was < 0.001. Dropout rate in Group A was 5%, while Group B was 12%. No adverse events were logged in either arm.`,
    targetOutputOrGoal: `| Cohort | Sample Size (n) | Retention Increase (%) | Dropout Rate (%) | P-Value |\n|---|---|---|---|---|\n| Group A | 120 | 34.2% | 5% | < 0.001 |\n| Group B | 115 | 4.1% | 12% | < 0.001 |`,
    constraints: [
      'Output MUST be a GitHub Markdown table only',
      'Strict zero-hallucination constraint',
      'Under 50 total output tokens'
    ],
    evaluationCriteria: 'Table formatting accuracy, numerical precision, token brevity.'
  },
  {
    id: 'tr-3',
    title: 'Constrained Roleplay & Reasoning',
    category: 'text-research',
    difficulty: 'Extreme',
    timeLimitSeconds: 180,
    description: 'Instruct the AI to explain Quantum Entanglement to a high schooler while obeying strict negative constraint rules.',
    constraints: [
      'Do NOT use the letter "e" anywhere in the explanation',
      'Must explain the core concept accurately in under 60 words',
      'Must sound like an encouraging mentor'
    ],
    targetOutputOrGoal: 'A clear explanation of entanglement avoiding all words containing the letter "e".',
    evaluationCriteria: 'Zero instances of letter "e", conceptual clarity, length constraint.'
  },

  // CODING CHALLENGES
  {
    id: 'cd-1',
    title: 'Algorithmic Optimization O(N^2) -> O(N)',
    category: 'coding',
    difficulty: 'Medium',
    timeLimitSeconds: 300,
    description: 'Prompt the model to refactor a slow nested-loop duplicate detection function into an optimal O(N) HashMap solution in TypeScript, with JSDoc comments and zero external libraries.',
    sampleInput: `function findDuplicates(arr: number[]): number[] {\n  const dupes: number[] = [];\n  for(let i=0; i<arr.length; i++) {\n    for(let j=i+1; j<arr.length; j++) {\n      if(arr[i] === arr[j] && !dupes.includes(arr[i])) {\n        dupes.push(arr[i]);\n      }\n    }\n  }\n  return dupes;\n}`,
    targetOutputOrGoal: `An optimized TypeScript function using a Set/Map achieving O(N) time complexity with typed signatures and JSDoc documentation.`,
    constraints: [
      'Time complexity must be strictly O(N)',
      'Must include JSDoc comments',
      'Must be pure TypeScript without third-party dependencies'
    ],
    evaluationCriteria: 'Algorithmic correctness, time complexity improvement, code cleanliness.'
  },
  {
    id: 'cd-2',
    title: 'Reverse Code Engineering',
    category: 'coding',
    difficulty: 'Hard',
    timeLimitSeconds: 300,
    description: 'Write a prompt that takes an input data array and expected transformation trace, and generates the cleanest tail-recursive function in JavaScript.',
    sampleInput: `Input: [1, [2, [3, 4], 5], 6]\nExpected Output: [1, 2, 3, 4, 5, 6]\nRequirement: Flatten deeply nested arrays without Array.prototype.flat()`,
    targetOutputOrGoal: `A clean recursive flattening function in JavaScript without using built-in flat().`,
    constraints: [
      'Cannot use Array.prototype.flat or flatMap',
      'Must handle arbitrary nesting depth',
      'Must include clean line-by-line inline comments'
    ],
    evaluationCriteria: 'Correctness on edge cases, constraint compliance, functional programming style.'
  },
  {
    id: 'cd-3',
    title: 'Zod & React Hook Form Schema Transpiler',
    category: 'coding',
    difficulty: 'Extreme',
    timeLimitSeconds: 360,
    description: 'Prompt the LLM to take an OpenAPI schema definition and output complete Zod schemas + inferred TypeScript types in one shot.',
    sampleInput: `paths: /user/register (POST with email, password min 8 chars, age min 18, termsAccepted boolean)`,
    targetOutputOrGoal: `z.object({ email: z.string().email(), password: z.string().min(8), age: z.number().min(18), termsAccepted: z.literal(true) })`,
    constraints: [
      'Must export both Zod schema and z.infer type definition',
      'Must include custom error messages for validation rules',
      '100% production ready TypeScript code'
    ],
    evaluationCriteria: 'Schema validity, Zod API correctness, type export completeness.'
  }
];
