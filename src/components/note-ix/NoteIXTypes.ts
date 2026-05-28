export type SourceType = 'pdf' | 'url' | 'text' | 'youtube' | 'audio' | 'video' | 'epub' | 'docx' | 'image';

export interface NoteSource {
  id: string;
  title: string;
  type: SourceType;
  content: string; // The extracted text content for RAG
  metadata?: any;
  addedAt: number;
}

export interface NoteIXMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations?: { sourceId: string; snippet: string }[];
  artifactId?: string;
  timestamp: number;
}

export interface StudioArtifact {
  id: string;
  type: 'briefing_doc' | 'flashcards' | 'study_guide' | 'audio_overview' | 'mind_map' | 'slide_deck' | 'faq' | 'timeline';
  title: string;
  content: string; // Markdown or JSON depending on type
  createdAt: number;
}

export interface Notebook {
  id: string;
  title: string;
  sources: NoteSource[];
  chatHistory: NoteIXMessage[];
  artifacts: StudioArtifact[];
  lastAccessed: number;
}
