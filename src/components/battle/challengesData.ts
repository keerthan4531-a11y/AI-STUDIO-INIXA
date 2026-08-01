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
  imageUrl?: string;
  visualDescription?: string;
  requiredKeywords?: string[];
  evaluationCriteria: string;
}

export const BATTLE_CHALLENGES: BattleChallenge[] = [
  {
    id: 'q1',
    questionNumber: 1,
    title: 'Q1: Cyberpunk Neon Cityscape',
    category: 'image-to-prompt',
    difficulty: 'Hard',
    timeLimitSeconds: 360, // 6 Minutes
    description: 'Inspect Target Image 1 carefully. Write detailed prompt instructions to recreate the futuristic night cityscape, flying vehicles, neon reflections, and holograms.',
    imageUrl: '/battle-assets/img_task_1.png',
    visualDescription: 'A futuristic cyberpunk city at night with blue & violet neon lights, flying vehicles between towering skyscrapers, holographic billboards, and wet asphalt reflections.',
    requiredKeywords: ['cyberpunk', 'neon', 'flying vehicles', 'skyscrapers', 'hologram', 'wet pavement'],
    sampleInput: 'TARGET IMAGE 1: Futuristic Cyberpunk Cityscape at Night with Flying Vehicles & Holograms',
    targetOutputOrGoal: 'Prompt describing a futuristic night cyberpunk city with glowing neon skyscrapers, flying vehicles, and wet street reflections.',
    constraints: [
      'MUST describe key visual subjects, color scheme (neon blue/violet), and urban style',
      'MUST specify flying vehicles between skyscrapers and wet street reflections',
      'No low-effort or generic prompts under 15 words'
    ],
    evaluationCriteria: 'Visual keyword matching, style precision, composition detail, and artistic fidelity.'
  },
  {
    id: 'q2',
    questionNumber: 2,
    title: 'Q2: 3D Glass AI Neural Network Sphere',
    category: 'image-to-prompt',
    difficulty: 'Hard',
    timeLimitSeconds: 360, // 6 Minutes
    description: 'Inspect Target Image 2 carefully. Write detailed prompt instructions describing the floating glowing glass sphere containing AI neural network nodes over a metallic microchip grid.',
    imageUrl: '/battle-assets/img_task_2.png',
    visualDescription: 'A 3D glass sphere floating above a dark metallic circuit microchip grid, containing glowing cyan AI neural network nodes and synapse connections.',
    requiredKeywords: ['glass sphere', 'neural network', 'cyan', 'circuit board', 'microchip', 'floating'],
    sampleInput: 'TARGET IMAGE 2: 3D Glowing Glass Sphere containing AI Neural Network Nodes over Microchip Grid',
    targetOutputOrGoal: 'Prompt describing a floating glass sphere with glowing cyan neural nodes over a dark microchip background.',
    constraints: [
      'MUST describe floating glass sphere with glowing cyan synapse neural nodes',
      'MUST specify microchip circuit board background and metallic reflection',
      'No low-effort or generic prompts under 15 words'
    ],
    evaluationCriteria: 'Visual keyword matching, style precision, composition detail, and artistic fidelity.'
  },
  {
    id: 'q3',
    questionNumber: 3,
    title: 'Q3: Underwater Bioluminescent Realm',
    category: 'image-to-prompt',
    difficulty: 'Extreme',
    timeLimitSeconds: 360, // 6 Minutes
    description: 'Inspect Target Image 3 carefully. Write prompt instructions detailing the deep ocean underwater coral reef, glowing bioluminescent jellyfish, and sleek exploration submarine.',
    imageUrl: '/battle-assets/img_task_3.png',
    visualDescription: 'Deep ocean underwater scene with glowing bioluminescent jellyfish, magenta and cyan coral reefs, and a sleek high-tech submarine floating in deep blue water.',
    requiredKeywords: ['underwater', 'bioluminescent jellyfish', 'coral reef', 'submarine', 'cyan and magenta'],
    sampleInput: 'TARGET IMAGE 3: Deep Ocean Bioluminescent Coral Reef with Glowing Jellyfish & Submarine',
    targetOutputOrGoal: 'Prompt describing a deep ocean underwater scene with glowing jellyfish, coral reefs, and a submarine.',
    constraints: [
      'MUST describe deep underwater lighting and bioluminescent jellyfish',
      'MUST specify magenta/cyan coral reef colors and high-tech submarine',
      'No low-effort or generic prompts under 15 words'
    ],
    evaluationCriteria: 'Visual keyword matching, style precision, composition detail, and artistic fidelity.'
  },
  {
    id: 'q4',
    questionNumber: 4,
    title: 'Q4: Fantasy Floating Sky Island Castle',
    category: 'image-to-prompt',
    difficulty: 'Extreme',
    timeLimitSeconds: 360, // 6 Minutes
    description: 'Inspect Target Image 4 carefully. Write detailed prompt instructions to capture the floating sky island, medieval castle, cascading cloud waterfalls, golden hour sunset, and dragon silhouette.',
    imageUrl: '/battle-assets/img_task_4.png',
    visualDescription: 'A floating sky island with a majestic medieval castle, cascading waterfalls pouring into clouds below, golden hour sunset lighting, and a flying dragon silhouette.',
    requiredKeywords: ['floating island', 'castle', 'waterfall', 'sunset', 'dragon', 'sky'],
    sampleInput: 'TARGET IMAGE 4: Fantasy Floating Sky Island Castle with Waterfalls & Sunset Dragon Silhouette',
    targetOutputOrGoal: 'Prompt describing a floating island castle in the sky with waterfalls, golden sunset light, and a dragon.',
    constraints: [
      'MUST describe sky floating island with medieval castle architecture',
      'MUST specify golden hour sunset lighting, waterfalls, and flying dragon',
      'No low-effort or generic prompts under 15 words'
    ],
    evaluationCriteria: 'Visual keyword matching, style precision, composition detail, and artistic fidelity.'
  },
  {
    id: 'q5',
    questionNumber: 5,
    title: 'Q5: Cybernetic Robot Warrior Mech Portrait',
    category: 'image-to-prompt',
    difficulty: 'Insane',
    timeLimitSeconds: 360, // 6 Minutes
    description: 'Inspect Target Image 5 carefully. Write detailed prompt instructions describing the macro portrait of a cybernetic warrior with polished titanium facial armor and glowing blue optics.',
    imageUrl: '/battle-assets/img_task_5.png',
    visualDescription: 'Hyper-realistic macro portrait of a futuristic cybernetic robot warrior with titanium facial armor, glowing blue optical eyes, and energetic power lines.',
    requiredKeywords: ['cybernetic', 'robot warrior', 'portrait', 'glowing blue eyes', 'titanium armor', 'mechanical'],
    sampleInput: 'TARGET IMAGE 5: Cybernetic Robot Warrior Close-Up Portrait with Glowing Blue Optics',
    targetOutputOrGoal: 'Prompt describing a macro portrait of a cybernetic warrior with titanium armor plates and glowing blue eyes.',
    constraints: [
      'MUST describe macro facial armor details and polished titanium metal',
      'MUST specify glowing blue optical eyes and energetic circuit lines',
      'No low-effort or generic prompts under 15 words'
    ],
    evaluationCriteria: 'Visual keyword matching, style precision, composition detail, and artistic fidelity.'
  },
  {
    id: 'q6',
    questionNumber: 6,
    title: 'Q6: Crystalline Glass Prism Rainbow Refraction',
    category: 'image-to-prompt',
    difficulty: 'Insane',
    timeLimitSeconds: 360, // 6 Minutes
    description: 'Inspect Target Image 6 carefully. Write detailed prompt instructions for a 3D crystalline glass prism refracting a white laser beam into a brilliant rainbow light spectrum.',
    imageUrl: '/battle-assets/img_task_6.png',
    visualDescription: 'Minimalist 3D render of a crystalline glass prism sitting on a dark reflective surface, refracting a bright laser beam into a brilliant rainbow light spectrum.',
    requiredKeywords: ['glass prism', 'rainbow refraction', 'laser beam', 'reflective surface', 'minimalist 3d'],
    sampleInput: 'TARGET IMAGE 6: Crystalline Glass Prism Refracting Laser Light Beam into Rainbow Spectrum',
    targetOutputOrGoal: 'Prompt describing a 3D glass prism refracting a white laser beam into a vivid rainbow light spectrum on a dark surface.',
    constraints: [
      'MUST describe crystalline glass geometry and dark reflective surface',
      'MUST specify bright white laser beam input and multi-color rainbow refraction output',
      'No low-effort or generic prompts under 15 words'
    ],
    evaluationCriteria: 'Visual keyword matching, style precision, composition detail, and artistic fidelity.'
  }
];
