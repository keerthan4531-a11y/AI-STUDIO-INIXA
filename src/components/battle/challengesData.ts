export interface BattleChallenge {
  id: string;
  questionNumber: number;
  title: string;
  category: 'text-research' | 'coding';
  difficulty: 'Easy' | 'Medium' | 'Hard' | 'Extreme' | 'Insane';
  timeLimitSeconds: number;
  description: string;
  targetOutputOrGoal: string;
  constraints: string[];
  sampleInput?: string;
  evaluationCriteria: string;
}

export const BATTLE_CHALLENGES: BattleChallenge[] = [
  {
    id: 'q1',
    questionNumber: 1,
    title: 'Q1: Unstructured Data to Hardcore Typed JSON',
    category: 'text-research',
    difficulty: 'Hard',
    timeLimitSeconds: 240,
    description: 'Write a prompt to parse a noisy support log into strict JSON. You MUST force the AI to perform unit math conversion, string normalization, and key sorting.',
    sampleInput: `Transcript: [DISREGARD Mac report #101]. Real Customer John Doe (ID 9842) called complaining desktop app on Windows 11 crashes when uploading files > 50MB. Investigation confirmed buffer overflow in upload streaming service. Recommending patch v2.4.1 deployment by end of day.`,
    targetOutputOrGoal: `{\n  "customer_id": 9842,\n  "file_limit_bytes": 52428800,\n  "name": "john_doe",\n  "os_code": "WIN_11_X64",\n  "patch_num": 2.41,\n  "root_cause_slug": "buffer_overflow_upload_streaming"\n}`,
    constraints: [
      'MUST convert 50MB to exact bytes integer: 52428800 (50 * 1024 * 1024)',
      'MUST format all string values in snake_case without spaces (e.g. "john_doe")',
      'MUST extract patch "v2.4.1" as numeric float 2.41',
      'JSON keys MUST be strictly in ALPHABETICAL ORDER',
      'No markdown ```json fences allowed & no intro/outro text'
    ],
    evaluationCriteria: 'Unit math calculation (52428800), float patch, snake_case strings, alphabetical key sorting.'
  },
  {
    id: 'q2',
    questionNumber: 2,
    title: 'Q2: Zero-Hallucination Academic Extraction',
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
    id: 'q3',
    questionNumber: 3,
    title: 'Q3: Constrained Roleplay & Reasoning',
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
  {
    id: 'q4',
    questionNumber: 4,
    title: 'Q4: Algorithmic Optimization O(N^2) -> O(N)',
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
    id: 'q5',
    questionNumber: 5,
    title: 'Q5: Reverse Code Engineering',
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
    id: 'q6',
    questionNumber: 6,
    title: 'Q6: In-Place Matrix Rotation O(1) Space',
    category: 'coding',
    difficulty: 'Insane',
    timeLimitSeconds: 360,
    description: 'Write a prompt forcing the AI to refactor an NxN matrix 90-degree clockwise rotation into an in-place algorithm using O(1) extra memory space.',
    sampleInput: `function rotateMatrix(matrix: number[][]): number[][] {\n  // Given N x N 2D matrix, rotate 90 deg clockwise in-place\n}`,
    targetOutputOrGoal: `In-place matrix transpose + row reversal achieving O(1) auxiliary space complexity.`,
    constraints: [
      'Space complexity MUST be strictly O(1) - No temporary 2D arrays',
      'Do NOT use Array.prototype.slice, map, concat, or push',
      'Must include inline mathematical proof comment explaining transpose + reverse'
    ],
    evaluationCriteria: 'Strict O(1) space constraint, mathematical proof comment, matrix correctness.'
  }
];
