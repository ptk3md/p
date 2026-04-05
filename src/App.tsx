import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Loader2, Home, X, FileText,
  CheckCircle2, XCircle, NotebookPen, EyeOff, Eye, Eraser, Sparkles, StickyNote,
  GraduationCap, BookOpen, ChevronDown, ChevronLeft, ChevronRight, Play, Trophy,
  Search, Award, AlertCircle,
} from 'lucide-react';
import Papa from 'papaparse';

import FilterScreen from './FilterScreen';

// ============================================================================
// 1. TIPAGENS INTEGRAIS
// ============================================================================
export interface Question {
  id: number; ano: string; banca?: string; categoria: string;
  tema_especifico: string; enunciado: string;
  a?: string; b?: string; c?: string; d?: string; e?: string;
  alternativas?: unknown; correta: string; comentario: string; origem: string;
  justificativa_a?: string; justificativa_b?: string; justificativa_c?: string;
  justificativa_d?: string; justificativa_e?: string;
  especialidade?: string; competencias?: string;
}

export interface FilterState {
  categorias: string[]; temas_especificos: string[]; anos: string[]; origens: string[];
  searchQueries: string[]; excludeCorrect: boolean; excludeSeen: boolean;
  onlyWrong?: boolean; especialidades?: string[]; competencias?: string[];
}

export type QuizStatus = 'idle' | 'active' | 'finished';
export type AppView = 'home' | 'exams' | 'dashboard' | 'settings' | 'sales' | 'quiz';

export interface UserHistoryItem {
  questionId: number; isCorrect: boolean; userAnswer: string; timestamp: number;
  category?: string; especialidade?: string; tema_especifico?: string; competencia?: string;
}

export interface AppSettings { theme: 'light' | 'dark'; focusMode: boolean; }

export interface QuestionSessionState {
  selectedOption: string | null; isSubmitted: boolean; isCommentExpanded: boolean;
  isSkipped?: boolean; eliminatedOptions?: string[]; highlights?: { start: number; end: number; text: string }[];
}

export interface QuizSession {
  id: string; created_at: number; filters: FilterState; total_questions: number;
  score?: number; title?: string; is_saved: boolean; question_ids: number[];
  current_index: number; status: 'active' | 'completed' | 'abandoned'; answers: Record<string, string>;
}

// ============================================================================
// 2. ENGINE LOCAL
// ============================================================================
const STORAGE_KEYS = {
  HISTORY: 'apexmed_history', SESSIONS: 'apexmed_sessions',
  PROGRESS: 'apexmed_progress', SETTINGS: 'apexmed_settings', USAGE: 'apexmed_daily_usage',
} as const;

const localDb = {
  getHistory: (): UserHistoryItem[] => JSON.parse(localStorage.getItem(STORAGE_KEYS.HISTORY) || '[]'),
  saveAnswer: (item: UserHistoryItem) => {
    const hist = localDb.getHistory();
    hist.push(item);
    localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(hist));
  },
  getSessions: (): QuizSession[] => JSON.parse(localStorage.getItem(STORAGE_KEYS.SESSIONS) || '[]'),
  saveSession: (session: QuizSession) => {
    const sess = localDb.getSessions();
    const idx = sess.findIndex(s => s.id === session.id);
    if (idx >= 0) sess[idx] = session; else sess.push(session);
    localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(sess));
  },
  getActiveSession: (): QuizSession | null => localDb.getSessions().find(s => s.status === 'active') || null,
  getProgress: () => JSON.parse(localStorage.getItem(STORAGE_KEYS.PROGRESS) || 'null'),
  saveProgress: (data: unknown) => localStorage.setItem(STORAGE_KEYS.PROGRESS, JSON.stringify(data)),
  checkDailyLimit: (): boolean => {
    const today = new Date().toDateString();
    const usage = JSON.parse(localStorage.getItem(STORAGE_KEYS.USAGE) || '{"date":"","count":0}');
    if (usage.date !== today) {
      localStorage.setItem(STORAGE_KEYS.USAGE, JSON.stringify({ date: today, count: 1 }));
      return true;
    }
    if (usage.count >= 10) return false;
    localStorage.setItem(STORAGE_KEYS.USAGE, JSON.stringify({ date: today, count: usage.count + 1 }));
    return true;
  },
};

// ============================================================================
// 3. COMPONENTES VISUAIS AUXILIARES
// ============================================================================
const GlobalLoading = ({ message }: { message: string }) => (
  <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center font-sans">
    <div className="w-16 h-16 text-[#BD4234] animate-spin mb-6"><Loader2 size={64} /></div>
    <h2 className="text-xl font-bold text-slate-800 dark:text-white animate-pulse">{message}</h2>
  </div>
);

const QuizTimer = React.memo(({ isRunning, initialTime = 0, onTimeUpdate }: {
  isRunning: boolean; initialTime?: number; onTimeUpdate: (t: number) => void;
}) => {
  const [time, setTime] = useState(initialTime);

  useEffect(() => {
    if (!isRunning) return;
    const intervalId = setInterval(() => {
      setTime(t => { const nt = t + 1; onTimeUpdate(nt); return nt; });
    }, 1000);
    return () => clearInterval(intervalId);
  }, [isRunning, onTimeUpdate]);

  const formatTime = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return h > 0
      ? `${h}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`
      : `${m}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md font-mono text-xs text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
      {formatTime(time)}
    </div>
  );
});

// ============================================================================
// 4. EXAMS SCREEN
// ============================================================================
const ExamsScreen: React.FC<{
  questions: Partial<Question>[];
  history: UserHistoryItem[];
  onStartExam: (origem: string, ano: string) => void;
}> = ({ questions, history, onStartExam }) => {
  const [selectedExam, setSelectedExam] = useState<{
    id: string; origem: string; ano: string; count: number;
    userCorrect: number; userTotalDone: number; score: number; isComplete: boolean;
  } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const availableExams = useMemo(() => {
    const groups: Record<string, { count: number; ids: number[] }> = {};
    questions.forEach(q => {
      if (q.origem && q.ano && q.origem.trim().toLowerCase() !== 'desconhecido') {
        const key = `${q.origem} - ${q.ano}`;
        if (!groups[key]) groups[key] = { count: 0, ids: [] };
        groups[key].count++;
        groups[key].ids.push(q.id!);
      }
    });

    const historyMap = new Map(history.map(h => [h.questionId, h.isCorrect]));

    return Object.entries(groups)
      .filter(([, data]) => data.count > 0)
      .map(([key, data]) => {
        const [origem, ano] = key.split(' - ');
        let correctCount = 0;
        let doneCount = 0;
        data.ids.forEach(qid => {
          if (historyMap.has(qid)) {
            doneCount++;
            if (historyMap.get(qid)) correctCount++;
          }
        });
        return {
          id: key, origem, ano, count: data.count,
          userCorrect: correctCount, userTotalDone: doneCount,
          score: doneCount > 0 ? Math.round((correctCount / doneCount) * 100) : 0,
          isComplete: doneCount === data.count,
        };
      })
      .sort((a, b) => a.origem.localeCompare(b.origem) || Number(b.ano) - Number(a.ano));
  }, [questions, history]);

  const displayedExams = useMemo(() =>
    !searchTerm.trim()
      ? availableExams
      : availableExams.filter(e =>
          e.origem.toLowerCase().includes(searchTerm.toLowerCase()) ||
          e.ano.includes(searchTerm.toLowerCase())
        ),
    [availableExams, searchTerm]
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 pb-32 animate-in fade-in duration-500 font-sans">
      <div className="text-center py-6 max-w-2xl mx-auto space-y-6">
        <div className="animate-in slide-in-from-top-4 duration-500">
          <h1 className="text-3xl md:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-4">
            Provas na <span className="text-[#BD4234]">Íntegra</span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm md:text-base leading-relaxed">
            Domine as bancas. Simule as condições reais de prova com o conteúdo completo organizado por ano.
          </p>
        </div>
        <div className="relative group z-10 animate-in zoom-in-95 duration-300">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
            <Search size={18} />
          </div>
          <input
            type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            placeholder="Buscar banca (ex: ENARE) ou ano..."
            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl py-3.5 pl-11 pr-12 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:border-[#BD4234] focus:ring-1 focus:ring-[#BD4234]/30 shadow-sm transition-all"
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-[#BD4234] transition-colors">
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      {displayedExams.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center border border-dashed border-slate-200 rounded-2xl max-w-2xl mx-auto">
          <h3 className="font-semibold text-slate-900 dark:text-white mb-1">Nenhuma prova encontrada</h3>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-5">
          {displayedExams.map(exam => (
            <button
              key={exam.id} onClick={() => setSelectedExam(exam)}
              className="group relative bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm hover:border-[#BD4234]/50 transition-all flex flex-col justify-between h-[240px] text-left w-full"
            >
              {exam.isComplete && (
                <div className="absolute top-3 right-3 z-20 text-emerald-500 bg-emerald-50 p-1.5 rounded-md">
                  <CheckCircle2 size={16} strokeWidth={2.5} />
                </div>
              )}
              <div className="relative z-10 w-full">
                <div className="flex justify-between items-start mb-4">
                  <div className="inline-flex flex-col items-center justify-center w-12 h-12 rounded-lg bg-slate-50 dark:bg-slate-800 border group-hover:bg-[#BD4234] group-hover:text-white transition-colors">
                    <span className="text-[9px] font-bold uppercase opacity-70">Ano</span>
                    <span className="text-sm font-black">{exam.ano}</span>
                  </div>
                  {exam.score > 0 && (
                    <div className={`flex flex-col items-end ${exam.score >= 70 ? 'text-emerald-600' : 'text-amber-600'}`}>
                      <div className="flex items-center gap-1 font-bold text-sm"><Trophy size={14} /> {exam.score}%</div>
                      <span className="text-[9px] uppercase opacity-70">Aproveitamento</span>
                    </div>
                  )}
                </div>
                <div className="space-y-1 mt-4">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase flex items-center gap-1"><BookOpen size={12} /> Banca</p>
                  <h3 className="text-lg font-bold text-slate-800 dark:text-white line-clamp-2">{exam.origem}</h3>
                </div>
              </div>
              <div className="relative z-10 w-full pt-4 mt-auto border-t border-slate-100 dark:border-slate-800">
                <div className="flex justify-between text-xs font-medium text-slate-500 mb-2">
                  <span className="flex items-center gap-1.5"><FileText size={14} /> {exam.count} Questões</span>
                  <span>{Math.round((exam.userTotalDone / exam.count) * 100)}%</span>
                </div>
                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${exam.isComplete ? 'bg-emerald-500' : 'bg-[#BD4234]'}`}
                    style={{ width: `${(exam.userTotalDone / exam.count) * 100}%` }}
                  />
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {selectedExam && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-xl p-6 max-w-sm w-full text-center">
            <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4 text-[#BD4234]"><Award size={32} /></div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Iniciar Simulado?</h2>
            <p className="text-slate-500 mb-6 text-sm">Prova <strong>{selectedExam.origem} {selectedExam.ano}</strong> com {selectedExam.count} questões.</p>
            <div className="space-y-3">
              <button
                onClick={() => { onStartExam(selectedExam.origem, selectedExam.ano); setSelectedExam(null); }}
                className="w-full py-3 bg-[#BD4234] text-white rounded-lg font-semibold text-sm flex items-center justify-center gap-2"
              >
                <Play size={16} fill="currentColor" /> Iniciar Agora
              </button>
              <button onClick={() => setSelectedExam(null)} className="w-full py-3 border rounded-lg font-semibold text-sm text-slate-600">Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// 5. QUESTION CARD
// ============================================================================
const CATEGORY_MAP: Record<string, string> = {
  'CB': 'Ciclo Básico', 'CC': 'Clínica Cirúrgica', 'CM': 'Clínica Médica',
  'GO': 'Ginecologia e Obstetrícia', 'PED': 'Pediatria', 'SC': 'Saúde Coletiva',
  'PREV': 'Medicina Preventiva',
};

const JustificationAccordion = ({ letter, text }: { letter: string; text: string }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden bg-white dark:bg-zinc-900 mb-3 shadow-sm">
      <button onClick={() => setIsOpen(!isOpen)} className="w-full flex items-center justify-between p-4 hover:bg-zinc-100 transition-colors">
        <div className="flex items-center gap-3">
          <span className="flex items-center justify-center w-8 h-8 rounded-full bg-rose-100 text-rose-600 text-sm font-bold">{letter}</span>
          <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Por que a {letter} está incorreta?</span>
        </div>
        {isOpen ? <ChevronDown size={18} className="rotate-180 text-zinc-400" /> : <ChevronDown size={18} className="text-zinc-400" />}
      </button>
      {isOpen && (
        <div className="p-5 text-sm md:text-base text-zinc-600 dark:text-zinc-300 bg-white dark:bg-zinc-900 border-t">{text}</div>
      )}
    </div>
  );
};

const PremiumLockModal = ({ onNavigate }: { onNavigate?: (view: AppView) => void }) => (
  <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-md">
    <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2rem] shadow-2xl overflow-hidden text-center relative border border-slate-200 dark:border-slate-800">
      <div className="p-8 text-white bg-[#C04A3A]">
        <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-4"><AlertCircle size={32} /></div>
        <h2 className="text-2xl font-black mb-1">Limite Diário Atingido</h2>
        <p className="font-medium text-sm text-red-100">Você mandou bem hoje!</p>
      </div>
      <div className="p-8 space-y-6">
        <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed">
          Você atingiu o limite de <strong>10 questões diárias</strong> do plano gratuito. Para continuar praticando sem limites, torne-se Premium.
        </p>
        <div className="space-y-3">
          <button className="block w-full py-4 text-white font-bold rounded-xl shadow-lg bg-[#C04A3A] hover:bg-[#9a3b2e]">Quero Acesso Ilimitado</button>
          <button onClick={() => onNavigate?.('home')} className="block w-full py-4 text-slate-500 font-bold text-xs hover:text-slate-800">Voltar para o Início</button>
        </div>
      </div>
    </div>
  </div>
);

interface QuestionCardProps {
  question: Question;
  currentIndex: number;
  totalQuestions: number;
  onNext?: () => void;
  onAnswer?: (isCorrect: boolean) => void;
  savedState?: QuestionSessionState;
  onStateChange?: (state: QuestionSessionState) => void;
  onBack?: () => void;
  isLastQuestion: boolean;
  onFinish?: () => void;
  onNavigate?: (view: AppView) => void;
}

const QuestionCard: React.FC<QuestionCardProps> = ({
  question, currentIndex, totalQuestions, onNext, onAnswer,
  savedState, onStateChange, onBack, isLastQuestion, onFinish, onNavigate,
}) => {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isCommentExpanded, setIsCommentExpanded] = useState(false);
  const [eliminatedOptions, setEliminatedOptions] = useState<string[]>([]);
  const [highlights, setHighlights] = useState<{ start: number; end: number; text: string }[]>([]);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [userNote, setUserNote] = useState('');

  const enunciadoRef = useRef<HTMLDivElement>(null);

  // FIX: useRef para evitar stale closure no onStateChange sem incluí-lo nos deps
  const onStateChangeRef = useRef(onStateChange);
  useEffect(() => { onStateChangeRef.current = onStateChange; });

  useEffect(() => {
    if (savedState) {
      setSelectedOption(savedState.selectedOption);
      setIsSubmitted(savedState.isSubmitted);
      setEliminatedOptions(savedState.eliminatedOptions || []);
      setHighlights(savedState.highlights || []);
    } else {
      setSelectedOption(null);
      setIsSubmitted(false);
      setEliminatedOptions([]);
      setHighlights([]);
      setShowPremiumModal(false);
    }
    const allNotes = JSON.parse(localStorage.getItem('questbank_user_notes') || '{}');
    setUserNote(allNotes[question.id] || '');
    setShowNotes(!!allNotes[question.id]);
  }, [question.id, savedState]);

  // FIX: onStateChange via ref — sem stale closure, sem re-render desnecessário
  useEffect(() => {
    onStateChangeRef.current?.({
      selectedOption, isSubmitted, isCommentExpanded: true, eliminatedOptions, highlights,
    });
  }, [selectedOption, isSubmitted, eliminatedOptions, highlights]);

  const gabaritoRaw = question.correta ? String(question.correta).toUpperCase() : '';
  const isAnulada = gabaritoRaw.includes('ANULADA') || gabaritoRaw.includes('EXCLUIDA');

  const correctKeys = useMemo(
    () => isAnulada ? [] : gabaritoRaw.split('/').map(k => k.trim()),
    [gabaritoRaw, isAnulada]
  );

  const categoryDisplay = CATEGORY_MAP[question.categoria] || question.categoria;

  const isUserCorrect = useMemo(
    () => !selectedOption ? false : isAnulada || correctKeys.includes(selectedOption.toUpperCase()),
    [selectedOption, isAnulada, correctKeys]
  );

  const optionsList = useMemo(() => {
    const entries: Array<{ key: string; text: string }> = [];
    if (question.a) entries.push({ key: 'A', text: question.a });
    if (question.b) entries.push({ key: 'B', text: question.b });
    if (question.c) entries.push({ key: 'C', text: question.c });
    if (question.d) entries.push({ key: 'D', text: question.d });
    if (question.e) entries.push({ key: 'E', text: question.e });
    return entries;
  }, [question]);

  const handleSubmit = () => {
    if (!selectedOption || isSubmitting || isSubmitted) return;
    setIsSubmitting(true);
    if (!localDb.checkDailyLimit()) { setShowPremiumModal(true); setIsSubmitting(false); return; }

    const isCorrect = isAnulada || correctKeys.includes(selectedOption.toUpperCase());
    localDb.saveAnswer({ questionId: question.id, isCorrect, userAnswer: selectedOption, timestamp: Date.now(), category: question.categoria });

    setIsSubmitted(true);
    setIsCommentExpanded(true);
    onAnswer?.(isCorrect);
    setIsSubmitting(false);
  };

  const handleTextMouseUp = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !enunciadoRef.current) return;
    const range = selection.getRangeAt(0);
    if (!enunciadoRef.current.contains(range.commonAncestorContainer)) return;
    const preRange = range.cloneRange();
    preRange.selectNodeContents(enunciadoRef.current);
    preRange.setEnd(range.startContainer, range.startOffset);
    const start = preRange.toString().length;
    const text = range.toString();
    const end = start + text.length;
    if (text.trim().length > 0) {
      setHighlights(prev => {
        const hasOverlap = prev.some(h => (start >= h.start && start < h.end) || (end > h.start && end <= h.end));
        if (hasOverlap) { selection.removeAllRanges(); return prev; }
        const next = [...prev, { start, end, text }].sort((a, b) => a.start - b.start);
        selection.removeAllRanges();
        return next;
      });
    }
  }, []);

  const renderedEnunciado = useMemo(() => {
    const text = question.enunciado || 'Enunciado indisponível.';
    if (highlights.length === 0) return text;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    highlights.forEach((h, idx) => {
      if (h.start > lastIndex) parts.push(<span key={`t-${idx}`}>{text.substring(lastIndex, h.start)}</span>);
      const safeEnd = Math.min(h.end, text.length);
      parts.push(
        <mark
          key={`m-${idx}`}
          className="bg-yellow-200/60 rounded px-0.5 cursor-pointer hover:bg-red-200 transition-colors"
          onClick={e => { e.stopPropagation(); setHighlights(prev => prev.filter((_, i) => i !== idx)); }}
        >
          {text.substring(h.start, safeEnd)}
        </mark>
      );
      lastIndex = safeEnd;
    });
    if (lastIndex < text.length) parts.push(<span key="t-end">{text.substring(lastIndex)}</span>);
    return parts;
  }, [question.enunciado, highlights]);

  const getOptionStyles = (key: string) => {
    const isSelected = selectedOption === key;
    const isEliminated = eliminatedOptions.includes(key);
    const isCorrectKey = correctKeys.includes(key);

    let container = 'group relative flex items-start md:items-center gap-4 p-5 md:p-6 rounded-[1.25rem] border-2 transition-all duration-200 cursor-pointer text-base select-none ';
    let circle = 'mt-0.5 md:mt-0 flex items-center justify-center w-7 h-7 rounded-full border-[2px] flex-shrink-0 text-xs font-black transition-all ';
    let textStyle = 'leading-relaxed flex-1 font-medium transition-colors ';

    if (isSubmitted) {
      if (isAnulada) {
        container += isSelected ? 'bg-blue-50 border-blue-300' : 'opacity-70 bg-white border-zinc-100';
        circle += 'border-zinc-300 text-zinc-400';
        textStyle += 'text-zinc-500';
      } else if (isCorrectKey) {
        container += 'bg-emerald-50 border-emerald-500';
        circle += 'bg-emerald-600 border-emerald-600 text-white';
        textStyle += 'text-emerald-900 font-bold';
      } else if (isSelected) {
        container += 'bg-rose-50 border-rose-500';
        circle += 'bg-rose-500 border-rose-500 text-white';
        textStyle += 'text-rose-900';
      } else {
        container += 'opacity-60 bg-white border-zinc-100';
        circle += 'border-zinc-200';
        textStyle += 'text-zinc-400';
      }
    } else {
      if (isEliminated) {
        container += 'opacity-50 grayscale bg-zinc-50 border-zinc-100';
        circle += 'border-zinc-200 text-zinc-300';
        textStyle += 'line-through text-zinc-400 decoration-zinc-400/50';
      } else if (isSelected) {
        container += 'bg-white border-indigo-600 ring-4 ring-indigo-50 shadow-lg';
        circle += 'bg-indigo-600 border-indigo-600 text-white';
        textStyle += 'text-indigo-900 font-semibold';
      } else {
        container += 'bg-white border-zinc-200 hover:border-indigo-300 hover:bg-zinc-50';
        circle += 'border-zinc-300 text-zinc-400 group-hover:border-indigo-400 group-hover:text-indigo-500';
        textStyle += 'text-zinc-600 group-hover:text-zinc-900';
      }
    }
    return { container, circle, text: textStyle };
  };

  const saveNote = useCallback(() => {
    const n = JSON.parse(localStorage.getItem('questbank_user_notes') || '{}');
    if (userNote.trim()) n[question.id] = userNote; else delete n[question.id];
    localStorage.setItem('questbank_user_notes', JSON.stringify(n));
  }, [userNote, question.id]);

  return (
    <>
      {showPremiumModal && <PremiumLockModal onNavigate={onNavigate} />}
      <div className="h-full w-full overflow-y-auto bg-[#FDFDFD] dark:bg-[#09090b] flex flex-col items-center font-sans pb-[500px]">
        <div className="w-full max-w-[900px] p-6 md:py-12 space-y-8">
          <div className="flex flex-col gap-4 w-full">
            <div className="flex justify-between items-center">
              <span className="font-mono text-xs font-bold text-zinc-400 bg-zinc-100 px-3 py-1.5 rounded-lg tracking-wider">
                {String(currentIndex + 1).padStart(2, '0')} / {totalQuestions}
              </span>
              <div className="flex items-center gap-1 bg-white p-1 rounded-2xl border border-zinc-100 shadow-sm">
                {highlights.length > 0 && (
                  <button onClick={() => setHighlights([])} className="p-2 text-zinc-400 hover:text-rose-500 rounded-xl"><Eraser size={18} /></button>
                )}
                <button
                  onClick={() => setShowNotes(!showNotes)}
                  className={`p-2 rounded-xl ${showNotes || userNote ? 'text-amber-600 bg-amber-50' : 'text-zinc-400 hover:bg-zinc-50'}`}
                >
                  <StickyNote size={18} />
                </button>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs font-medium text-zinc-500 border-b border-zinc-100 pb-4">
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-100 rounded-full">
                <GraduationCap size={14} /><span className="text-zinc-900 font-bold">{question.origem}</span>
              </div>
              <span className="font-semibold">{question.ano}</span>
              <div className="flex items-center gap-1.5"><BookOpen size={14} /><span className="uppercase text-[11px]">{categoryDisplay}</span></div>
            </div>
          </div>

          <div ref={enunciadoRef} onMouseUp={handleTextMouseUp} className="text-lg md:text-[1.25rem] leading-[1.8] text-zinc-800 font-medium cursor-text tracking-tight">
            {renderedEnunciado}
          </div>

          <img
            src={`https://res.cloudinary.com/dfly2thac/image/upload/apex-med/${question.id}.jpg`}
            alt=""
            className="mt-6 max-w-full rounded-xl border border-zinc-200 shadow-sm"
            data-attempt="0"
            onError={e => {
              const t = e.currentTarget;
              const extensions = ['.jpg', '.png'];
              const attempt = parseInt(t.getAttribute('data-attempt') || '0');
              if (attempt < extensions.length - 1) {
                t.src = t.src.replace(extensions[attempt], extensions[attempt + 1]);
                t.setAttribute('data-attempt', String(attempt + 1));
              } else {
                t.style.display = 'none';
              }
            }}
          />

          {showNotes && (
            <div className="bg-amber-50 border border-amber-100 p-5 rounded-2xl">
              <div className="flex items-center gap-2 text-amber-700 font-bold text-xs uppercase mb-2"><NotebookPen size={14} /> Bloco de Notas</div>
              <textarea
                value={userNote}
                onChange={e => setUserNote(e.target.value)}
                onBlur={saveNote}
                className="w-full bg-transparent border-none focus:ring-0 text-zinc-800 resize-none h-24 text-sm"
                placeholder="Suas anotações..."
              />
            </div>
          )}

          <div className="flex flex-col gap-3 mt-6">
            {optionsList.map(opt => {
              const styles = getOptionStyles(opt.key);
              const isEliminated = eliminatedOptions.includes(opt.key);
              return (
                <div
                  key={opt.key}
                  onClick={() => !isEliminated && !isSubmitted && setSelectedOption(opt.key)}
                  className={styles.container}
                >
                  <div className={styles.circle}>
                    {isEliminated ? <EyeOff size={14} />
                      : isSubmitted && correctKeys.includes(opt.key) ? <CheckCircle2 size={16} />
                      : isSubmitted && selectedOption === opt.key ? <XCircle size={16} />
                      : opt.key}
                  </div>
                  <div className={styles.text}>{opt.text}</div>
                  {!isSubmitted && (
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        setEliminatedOptions(p => p.includes(opt.key) ? p.filter(x => x !== opt.key) : [...p, opt.key]);
                      }}
                      className={`absolute right-4 p-2 rounded-full border transition-all ${isEliminated ? 'opacity-100 bg-white text-zinc-400' : 'bg-white border-zinc-100 text-zinc-300 opacity-0 md:group-hover:opacity-100'}`}
                    >
                      {isEliminated ? <Eye size={18} /> : <EyeOff size={18} />}
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {isSubmitted && (
            <div className="mt-8 rounded-[2rem] bg-zinc-50/50 border border-zinc-200 overflow-hidden">
              <div className={`px-6 py-4 border-b flex items-center gap-3 ${isUserCorrect ? 'border-emerald-100' : 'border-rose-100'}`}>
                <div className={`p-1.5 rounded-lg ${isUserCorrect ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}><Sparkles size={18} /></div>
                <h3 className="font-bold">{isUserCorrect ? 'Você acertou! Confira o comentário:' : 'Resposta Incorreta. Veja a justificativa:'}</h3>
              </div>
              <div className="p-6 md:p-8 space-y-6">
                <p className="whitespace-pre-wrap leading-loose text-zinc-600">{question.comentario || 'Sem comentário.'}</p>
                {!isAnulada && optionsList.map(opt =>
                  !correctKeys.includes(opt.key) && (question as Record<string, unknown>)[`justificativa_${opt.key.toLowerCase()}`]
                    ? <JustificationAccordion key={opt.key} letter={opt.key} text={(question as Record<string, unknown>)[`justificativa_${opt.key.toLowerCase()}`] as string} />
                    : null
                )}
              </div>
            </div>
          )}

          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-white/90 backdrop-blur-xl p-2 rounded-full shadow-2xl border border-zinc-100 z-40">
            {onBack && (
              <button onClick={onBack} className="w-11 h-11 flex items-center justify-center rounded-full hover:bg-zinc-100 text-zinc-400">
                <ChevronLeft size={20} />
              </button>
            )}
            {!isSubmitted ? (
              <button
                onClick={handleSubmit}
                disabled={!selectedOption || isSubmitting}
                className="bg-zinc-900 text-white px-10 py-3 rounded-full font-bold text-sm disabled:opacity-50 hover:scale-[1.02] shadow-xl flex gap-2"
              >
                {isSubmitting ? 'Salvando...' : 'Responder'}
              </button>
            ) : onNext && !isLastQuestion ? (
              <button onClick={onNext} className="bg-indigo-600 text-white px-10 py-3 rounded-full font-bold text-sm flex items-center gap-2">
                Próxima <ChevronRight size={18} />
              </button>
            ) : (
              <button onClick={onFinish} className="bg-rose-600 text-white px-10 py-3 rounded-full font-bold text-sm flex items-center gap-2">
                Finalizar <AlertCircle size={18} />
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

// ============================================================================
// 6. QUIZ RESULT
// ============================================================================
// FIX: normaliza 'correta' da mesma forma que o QuestionCard ao corrigir respostas
function isAnswerCorrect(question: Question, selectedOption: string | null | undefined): boolean {
  if (!selectedOption) return false;
  const gabaritoRaw = question.correta ? String(question.correta).toUpperCase() : '';
  const isAnulada = gabaritoRaw.includes('ANULADA') || gabaritoRaw.includes('EXCLUIDA');
  if (isAnulada) return true;
  const correctKeys = gabaritoRaw.split('/').map(k => k.trim());
  return correctKeys.includes(selectedOption.toUpperCase());
}

const QuizResultScreen = ({
  questions,
  sessionState,
  onExit,
}: {
  questions: Question[];
  sessionState: Record<string, QuestionSessionState>;
  onRetry?: () => void;
  onExit: () => void;
}) => {
  const correct = questions.filter(q => isAnswerCorrect(q, sessionState[q.id]?.selectedOption)).length;
  const score = Math.round((correct / questions.length) * 100);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-3xl shadow-xl max-w-sm w-full text-center">
        <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6"><Trophy size={40} /></div>
        <h2 className="text-2xl font-black text-slate-800 mb-2">Simulado Concluído!</h2>
        <p className="text-slate-500 mb-8">Você acertou {correct} de {questions.length} questões ({score}%).</p>
        <button onClick={onExit} className="w-full py-4 bg-[#BD4234] text-white rounded-xl font-bold">Voltar ao Início</button>
      </div>
    </div>
  );
};

// ============================================================================
// 7. ORQUESTRADOR PRINCIPAL
// ============================================================================
export default function App() {
  const [appState, setAppState] = useState<'BOOT' | 'READY'>('BOOT');
  const [metadata, setMetadata] = useState<Question[]>([]);
  const [history, setHistory] = useState<UserHistoryItem[]>([]);

  const [currentView, setCurrentView] = useState<AppView>('home');
  const [slideDirection, setSlideDirection] = useState<'left' | 'right'>('right');

  const [quizStatus, setQuizStatus] = useState<QuizStatus>('idle');
  const [activeQuestions, setActiveQuestions] = useState<Question[]>([]);
  const [filters, setFilters] = useState<FilterState>({
    categorias: [], temas_especificos: [], anos: [], origens: [],
    searchQueries: [], excludeCorrect: false, excludeSeen: false,
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [sessionState, setSessionState] = useState<Record<string, QuestionSessionState>>({});

  const timerRef = useRef(0);
  const [settings] = useState<AppSettings>({ theme: 'light', focusMode: false });

  useEffect(() => {
    const loadApp = async () => {
      try {
        const SHEET_ID = '1K9p0IyfTZ-tS21LdOdEHBbX34ZDETlCngVfigrnAKnc';
        const csvUrl = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv`;
        const response = await fetch(csvUrl);
        const csvText = await response.text();

        Papa.parse(csvText, {
          header: true,
          skipEmptyLines: true,
          complete: results => {
            const loadedQuestions: Question[] = (results.data as Record<string, string>[]).map(row => ({
              id: Number(row.id || Math.floor(Math.random() * 10000)),
              ano: String(row.ano || ''),
              origem: String(row.origem || 'Desconhecido'),
              banca: String(row.banca || ''),
              categoria: String(row.categoria || ''),
              especialidade: String(row.especialidade || ''),
              tema_especifico: String(row.tema_especifico || ''),
              competencias: String(row.competencias || ''),
              enunciado: String(row.enunciado || ''),
              a: String(row.a || ''),
              b: String(row.b || ''),
              c: String(row.c || ''),
              d: String(row.d || ''),
              e: String(row.e || ''),
              correta: String(row.correta || '').trim(),
              comentario: String(row.comentario || ''),
              justificativa_a: String(row.justificativa_a || ''),
              justificativa_b: String(row.justificativa_b || ''),
              justificativa_c: String(row.justificativa_c || ''),
              justificativa_d: String(row.justificativa_d || ''),
              justificativa_e: String(row.justificativa_e || ''),
            }));

            const validQuestions = loadedQuestions.filter(q => q.enunciado && q.enunciado.length > 5);
            setMetadata(validQuestions);
            setHistory(localDb.getHistory());

            const prog = localDb.getProgress();
            if (prog) {
              if (prog.current_view) setCurrentView(prog.current_view);
              if (prog.filters) setFilters(prog.filters);
            }

            setAppState('READY');
          },
          error: err => {
            console.error('Erro ao ler o CSV do Google:', err);
            setAppState('READY');
          },
        });
      } catch (err) {
        console.error('Erro na requisição do Google Sheets:', err);
        setAppState('READY');
      }
    };

    loadApp();
  }, []);

  const persist = useCallback((pPage: number, pFilt: FilterState, pSt: string, pSess: unknown, pView: string) => {
    localDb.saveProgress({ page: pPage, filters: pFilt, timer: timerRef.current, session: pSess, view: pView, current_view: pView });
  }, []);

  const changeView = (newView: AppView) => {
    setSlideDirection(newView === 'exams' ? 'right' : 'left');
    setCurrentView(newView);
    persist(1, filters, quizStatus, {}, newView);
  };

  const handleStartQuiz = (limit: number, randomize: boolean, _smart: boolean, ids?: number[]) => {
    let finalQuestions = ids ? metadata.filter(q => ids.includes(q.id)) : [...metadata];
    if (randomize && !ids) finalQuestions.sort(() => Math.random() - 0.5);
    setActiveQuestions(finalQuestions.slice(0, limit));
    setSessionState({});
    setCurrentPage(1);
    timerRef.current = 0;
    setQuizStatus('active');
    persist(1, filters, 'active', {}, 'home');
  };

  const handleStartExam = (origem: string, ano: string) => {
    const examQ = metadata.filter(q => q.origem === origem && q.ano === ano);
    setActiveQuestions(examQ);
    setSessionState({});
    setCurrentPage(1);
    timerRef.current = 0;
    setQuizStatus('active');
    persist(1, filters, 'active', {}, 'exams');
  };

  const handleTimerUpdate = useCallback((t: number) => { timerRef.current = t; }, []);

  const handleStateChange = useCallback((questionId: number) => (s: QuestionSessionState) => {
    setSessionState(p => ({ ...p, [questionId]: s }));
  }, []);

  const handleAnswer = useCallback(() => { setHistory(localDb.getHistory()); }, []);

  if (appState === 'BOOT') return <GlobalLoading message="Conectando à base de dados..." />;

  const currentQuestion = activeQuestions[currentPage - 1];

  return (
    <>
      {quizStatus === 'finished' ? (
        <QuizResultScreen
          questions={activeQuestions}
          sessionState={sessionState}
          onExit={() => { setQuizStatus('idle'); setCurrentView('home'); }}
        />
      ) : quizStatus === 'active' ? (
        <div className="h-screen w-screen bg-slate-50 transition-colors duration-300 font-sans flex flex-col overflow-hidden">
          {!settings.focusMode && (
            <header className="flex-none bg-white border-b border-slate-200 px-4 h-14 flex items-center justify-between z-50">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-700 hidden sm:inline">Simulado</span>
                <QuizTimer isRunning onTimeUpdate={handleTimerUpdate} />
              </div>
              <button onClick={() => setQuizStatus('idle')} className="p-2 hover:bg-[#BD4234]/10 text-[#BD4234] rounded-lg">
                <X size={20} />
              </button>
            </header>
          )}
          <main className="flex-1 w-full relative overflow-hidden">
            {currentQuestion && (
              <QuestionCard
                question={currentQuestion}
                currentIndex={currentPage - 1}
                totalQuestions={activeQuestions.length}
                savedState={sessionState[currentQuestion.id]}
                onStateChange={handleStateChange(currentQuestion.id)}
                onAnswer={handleAnswer}
                onNext={() => setCurrentPage(p => p + 1)}
                onBack={currentPage > 1 ? () => setCurrentPage(p => p - 1) : undefined}
                isLastQuestion={currentPage === activeQuestions.length}
                onFinish={() => setQuizStatus('finished')}
                onNavigate={setCurrentView}
              />
            )}
          </main>
        </div>
      ) : (
        <div className="min-h-screen bg-slate-50 pb-20 font-sans overflow-x-hidden">
          <main className={`animate-in duration-500 ease-in-out ${slideDirection === 'right' ? 'slide-in-from-right-10 fade-in' : 'slide-in-from-left-10 fade-in'}`}>
            {currentView === 'home' && (
              <FilterScreen questions={metadata} history={history} filters={filters} setFilters={setFilters} onStartQuiz={handleStartQuiz} />
            )}
            {currentView === 'exams' && (
              <ExamsScreen questions={metadata} history={history} onStartExam={handleStartExam} />
            )}
          </main>

          <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-t border-slate-200 z-30 transition-all">
            <div className="flex justify-around items-center h-16 max-w-md mx-auto">
              <button onClick={() => changeView('home')} className={`p-2 rounded-xl transition-all ${currentView === 'home' ? 'text-[#BD4234] bg-red-50 scale-110' : 'text-slate-400'}`}>
                <Home size={24} />
              </button>
              <button onClick={() => changeView('exams')} className={`p-2 rounded-xl transition-all ${currentView === 'exams' ? 'text-[#BD4234] bg-red-50 scale-110' : 'text-slate-400'}`}>
                <FileText size={24} />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
