export interface ContextItem {
  id: string;
  contextNumber: number;
  title: string;
  imageUrl: string;
  visualDescription: string;
  requiredKeywords: string[];
  sampleInput: string;
  targetOutputOrGoal: string;
  bytesConversion?: number;
  ignoreTicket?: string;
}

export interface BattleChallenge {
  id: string;
  questionNumber: number;
  title: string;
  category: 'image-to-prompt' | 'text-research' | 'coding';
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
    title: 'Stage 1: Visual Image-to-Prompt Reverse Engineering (6 Tasks)',
    category: 'image-to-prompt',
    difficulty: 'Insane',
    timeLimitSeconds: 360, // 6 Minutes Total
    description: 'Inspect the provided 6 target AI images carefully. Write a detailed, highly descriptive prompt engineered instructions to recreate each visual artwork accurately.',
    targetOutputOrGoal: 'A comprehensive, multi-keyword prompt engineered text that accurately describes lighting, subject, style, color palette, and composition of the target image.',
    constraints: [
      'MUST describe key visual subjects, color scheme, and artistic style accurately',
      'MUST specify camera angle/composition (e.g. isometric, wide cinematic, macro close-up)',
      'MUST include lighting details (e.g. bioluminescent, neon blue/violet, golden hour sunset)',
      'No low-effort or generic prompts under 15 words'
    ],
    evaluationCriteria: 'Visual keyword matching, style precision, composition detail, and artistic fidelity.',
    contexts: [
      {
        id: 'q1-c1',
        contextNumber: 1,
        title: 'Task 1 of 6: Cyberpunk Neon Cityscape',
        imageUrl: '/battle-assets/img_task_1.png',
        visualDescription: 'A futuristic cyberpunk city at night with blue & violet neon lights, flying vehicles between towering skyscrapers, holographic billboards, and wet asphalt reflections.',
        requiredKeywords: ['cyberpunk', 'neon', 'flying vehicles', 'skyscrapers', 'hologram', 'wet pavement'],
        sampleInput: 'TARGET IMAGE: Futuristic Cyberpunk Cityscape at Night with Flying Vehicles & Holograms',
        targetOutputOrGoal: 'Prompt describing a futuristic night cyberpunk city with glowing neon skyscrapers, flying vehicles, and wet street reflections.'
      },
      {
        id: 'q1-c2',
        contextNumber: 2,
        title: 'Task 2 of 6: 3D Glass AI Neural Network Sphere',
        imageUrl: '/battle-assets/img_task_2.png',
        visualDescription: 'A 3D glass sphere floating above a dark metallic circuit microchip grid, containing glowing cyan AI neural network nodes and synapse connections.',
        requiredKeywords: ['glass sphere', 'neural network', 'cyan', 'circuit board', 'microchip', 'floating'],
        sampleInput: 'TARGET IMAGE: 3D Glowing Glass Sphere containing AI Neural Network Nodes over Microchip Grid',
        targetOutputOrGoal: 'Prompt describing a floating glass sphere with glowing cyan neural nodes over a dark microchip background.'
      },
      {
        id: 'q1-c3',
        contextNumber: 3,
        title: 'Task 3 of 6: Underwater Bioluminescent Realm',
        imageUrl: '/battle-assets/img_task_3.png',
        visualDescription: 'Deep ocean underwater scene with glowing bioluminescent jellyfish, magenta and cyan coral reefs, and a sleek high-tech submarine floating in deep blue water.',
        requiredKeywords: ['underwater', 'bioluminescent jellyfish', 'coral reef', 'submarine', 'cyan and magenta'],
        sampleInput: 'TARGET IMAGE: Deep Ocean Bioluminescent Coral Reef with Glowing Jellyfish & Submarine',
        targetOutputOrGoal: 'Prompt describing a deep ocean underwater scene with glowing jellyfish, coral reefs, and a submarine.'
      },
      {
        id: 'q1-c4',
        contextNumber: 4,
        title: 'Task 4 of 6: Fantasy Floating Sky Island Castle',
        imageUrl: '/battle-assets/img_task_4.png',
        visualDescription: 'A floating sky island with a majestic medieval castle, cascading waterfalls pouring into clouds below, golden hour sunset lighting, and a flying dragon silhouette.',
        requiredKeywords: ['floating island', 'castle', 'waterfall', 'sunset', 'dragon', 'sky'],
        sampleInput: 'TARGET IMAGE: Fantasy Floating Sky Island Castle with Waterfalls & Sunset Dragon Silhouette',
        targetOutputOrGoal: 'Prompt describing a floating island castle in the sky with waterfalls, golden sunset light, and a dragon.'
      },
      {
        id: 'q1-c5',
        contextNumber: 5,
        title: 'Task 5 of 6: Cybernetic Warrior Mech Portrait',
        imageUrl: '/battle-assets/img_task_5.png',
        visualDescription: 'Hyper-realistic macro portrait of a futuristic cybernetic robot warrior with titanium facial armor, glowing blue optical eyes, and energetic power lines.',
        requiredKeywords: ['cybernetic', 'robot warrior', 'portrait', 'glowing blue eyes', 'titanium armor', 'mechanical'],
        sampleInput: 'TARGET IMAGE: Cybernetic Robot Warrior Close-Up Portrait with Glowing Blue Optics',
        targetOutputOrGoal: 'Prompt describing a macro portrait of a cybernetic warrior with titanium armor plates and glowing blue eyes.'
      },
      {
        id: 'q6-c6',
        contextNumber: 6,
        title: 'Task 6 of 6: Crystalline Glass Prism Rainbow Refraction',
        imageUrl: '/battle-assets/img_task_6.png',
        visualDescription: 'Minimalist 3D render of a crystalline glass prism sitting on a dark reflective surface, refracting a bright laser beam into a brilliant rainbow light spectrum.',
        requiredKeywords: ['glass prism', 'rainbow refraction', 'laser beam', 'reflective surface', 'minimalist 3d'],
        sampleInput: 'TARGET IMAGE: Crystalline Glass Prism Refracting Laser Light Beam into Rainbow Spectrum',
        targetOutputOrGoal: 'Prompt describing a 3D glass prism refracting a white laser beam into a vivid rainbow light spectrum on a dark surface.'
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
