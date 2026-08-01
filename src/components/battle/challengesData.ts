export interface ContextItem {
  id: string;
  contextNumber: number;
  title: string;
  sampleInput: string;
  targetOutputOrGoal: string;
  bytesConversion: number;
  ignoreTicket: string;
}

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
  contexts?: ContextItem[];
}

export const BATTLE_CHALLENGES: BattleChallenge[] = [
  {
    id: 'q1',
    questionNumber: 1,
    title: 'Q1: Unstructured Data to Hardcore Typed JSON (6 Contexts)',
    category: 'text-research',
    difficulty: 'Insane',
    timeLimitSeconds: 360, // Exactly 6 Minutes Total
    description: 'Write a prompt to parse 6 different noisy support log contexts into strict JSON. Perform exact MB-to-Bytes unit calculation, string normalization, and key sorting.',
    sampleInput: `Transcript: [DISREGARD Mac report #101]. Real Customer John Doe (ID 9842) called complaining desktop app on Windows 11 crashes when uploading files > 50MB. Investigation confirmed buffer overflow in upload streaming service. Recommending patch v2.4.1 deployment by end of day.`,
    targetOutputOrGoal: `{\n  "customer_id": 9842,\n  "file_limit_bytes": 52428800,\n  "name": "john_doe",\n  "os_code": "WIN_11_X64",\n  "patch_num": 2.41,\n  "root_cause_slug": "buffer_overflow_upload_streaming"\n}`,
    constraints: [
      'MUST convert megabytes (e.g. 50MB) to exact bytes integer (50 * 1024 * 1024)',
      'MUST format all string values in snake_case without spaces (e.g. "john_doe")',
      'MUST extract patch numbers as numeric floats (e.g. 2.41)',
      'JSON keys MUST be strictly in ALPHABETICAL ORDER',
      'No markdown ```json fences allowed & no intro/outro text'
    ],
    evaluationCriteria: 'Exact math unit calculation, float patch, snake_case strings, alphabetical key sorting, ignore fake tickets.',
    contexts: [
      {
        id: 'q1-c1',
        contextNumber: 1,
        title: 'Context 1 of 6: Customer John Doe (Windows 11, 50MB)',
        sampleInput: `Transcript: [DISREGARD Mac report #101]. Real Customer John Doe (ID 9842) called complaining desktop app on Windows 11 crashes when uploading files > 50MB. Investigation confirmed buffer overflow in upload streaming service. Recommending patch v2.4.1 deployment by end of day.`,
        targetOutputOrGoal: `{\n  "customer_id": 9842,\n  "file_limit_bytes": 52428800,\n  "name": "john_doe",\n  "os_code": "WIN_11_X64",\n  "patch_num": 2.41,\n  "root_cause_slug": "buffer_overflow_upload_streaming"\n}`,
        bytesConversion: 52428800,
        ignoreTicket: '101'
      },
      {
        id: 'q1-c2',
        contextNumber: 2,
        title: 'Context 2 of 6: Verified User Sarah Connor (Android 14, 120MB)',
        sampleInput: `Transcript: [IGNORE iOS ticket #404]. Verified User Sarah Connor (ID 7712) reported mobile app on Android 14 freezing when rendering logs > 120MB. Root cause identified as heap exhaustion in JSON parsing engine. Recommending hotfix v3.1.0 deployment by 6:00 PM.`,
        targetOutputOrGoal: `{\n  "customer_id": 7712,\n  "file_limit_bytes": 125829120,\n  "name": "sarah_connor",\n  "os_code": "ANDROID_14",\n  "patch_num": 3.1,\n  "root_cause_slug": "heap_exhaustion_json_parsing"\n}`,
        bytesConversion: 125829120,
        ignoreTicket: '404'
      },
      {
        id: 'q1-c3',
        contextNumber: 3,
        title: 'Context 3 of 6: Real Customer Marcus Aurelius (Linux Ubuntu, 256MB)',
        sampleInput: `Transcript: [DISREGARD Ubuntu draft #999]. Real Customer Marcus Aurelius (ID 3341) reported CLI tool on Linux Ubuntu 22.04 throwing Segmentation Fault when piping data > 256MB. Root cause stack memory leak in IPC pipeline. Recommending patch v1.8.4 deployment ASAP.`,
        targetOutputOrGoal: `{\n  "customer_id": 3341,\n  "file_limit_bytes": 268435456,\n  "name": "marcus_aurelius",\n  "os_code": "LINUX_UBUNTU_22_04",\n  "patch_num": 1.84,\n  "root_cause_slug": "stack_memory_leak_ipc"\n}`,
        bytesConversion: 268435456,
        ignoreTicket: '999'
      },
      {
        id: 'q1-c4',
        contextNumber: 4,
        title: 'Context 4 of 6: Enterprise Customer Emma Watson (macOS Sonoma, 80MB)',
        sampleInput: `Transcript: [IGNORE Web portal note #202]. Enterprise Customer Emma Watson (ID 5590) reported Cloud Dashboard on macOS Sonoma crashing when exporting report > 80MB. Root cause unhandled exception in PDF rendering worker. Recommending patch v4.0.2 deployment tonight.`,
        targetOutputOrGoal: `{\n  "customer_id": 5590,\n  "file_limit_bytes": 83886080,\n  "name": "emma_watson",\n  "os_code": "MACOS_SONOMA",\n  "patch_num": 4.02,\n  "root_cause_slug": "unhandled_exception_pdf_worker"\n}`,
        bytesConversion: 83886080,
        ignoreTicket: '202'
      },
      {
        id: 'q1-c5',
        contextNumber: 5,
        title: 'Context 5 of 6: Real Customer David Miller (Windows Server 2022, 500MB)',
        sampleInput: `Transcript: [DISREGARD Windows Server legacy log #303]. Real Customer David Miller (ID 1188) reported backend API client on Windows Server 2022 timing out on payloads > 500MB. Root cause socket timeout in TLS handshake module. Recommending patch v5.12.0 deployment tomorrow morning.`,
        targetOutputOrGoal: `{\n  "customer_id": 1188,\n  "file_limit_bytes": 524288000,\n  "name": "david_miller",\n  "os_code": "WIN_SERVER_2022",\n  "patch_num": 5.12,\n  "root_cause_slug": "socket_timeout_tls_handshake"\n}`,
        bytesConversion: 524288000,
        ignoreTicket: '303'
      },
      {
        id: 'q1-c6',
        contextNumber: 6,
        title: 'Context 6 of 6: Key Customer Priyadarshini K (Windows 11, 1024MB)',
        sampleInput: `Transcript: [IGNORE Android beta ticket #707]. Key Customer Priyadarshini K (ID 8844) reported desktop client on Windows 11 crashing when loading database > 1024MB. Root cause memory deadlock in SQLite sync thread. Recommending emergency patch v6.0.1 deployment immediately.`,
        targetOutputOrGoal: `{\n  "customer_id": 8844,\n  "file_limit_bytes": 1073741824,\n  "name": "priyadarshini_k",\n  "os_code": "WIN_11_X64",\n  "patch_num": 6.01,\n  "root_cause_slug": "memory_deadlock_sqlite_sync"\n}`,
        bytesConversion: 1073741824,
        ignoreTicket: '707'
      }
    ]
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
