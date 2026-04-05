// src/types.ts

export interface Question {
  id: number;
  ano: string;
  banca?: string;
  categoria: string;
  tema_especifico: string;
  enunciado: string;
  a?: string;
  b?: string;
  c?: string;
  d?: string;
  e?: string;
  alternativas?: any; // Para retrocompatibilidade caso use JSON stringificado
  correta: string;
  comentario: string;
  origem: string;
  justificativa_a?: string;
  justificativa_b?: string;
  justificativa_c?: string;
  justificativa_d?: string;
  justificativa_e?: string;
  especialidade?: string;
  competencias?: string; 
}

export interface FilterState {
  categorias: string[];
  temas_especificos: string[];
  anos: string[];
  origens: string[];
  searchQueries: string[];
  excludeCorrect: boolean;
  excludeSeen: boolean;
  onlyWrong?: boolean;
  especialidades?: string[];
  competencias?: string[];
}

export interface UserHistoryItem {
  questionId: number;
  isCorrect: boolean;
  userAnswer: string;
  timestamp: number;
  category?: string;
  especialidade?: string;
  tema_especifico?: string;
  competencia?: string;
}

export type AppView = 'home' | 'exams' | 'quiz' | 'results';

export interface QuestionSessionState {
  selectedOption: string | null;
  isSubmitted: boolean;
  isCommentExpanded: boolean;
  isSkipped?: boolean;
  eliminatedOptions?: string[];
  highlights?: { start: number; end: number; text: string }[];
}

export interface QuizSession {
  id: string;
  created_at: number;
  updated_at?: number;
  status: 'active' | 'completed' | 'abandoned';
  filters: FilterState;
  question_ids: number[];
  current_index: number;
  answers: Record<string, string>;
  score?: number;
  total_questions: number;
  title?: string;
  is_saved?: boolean;
}
