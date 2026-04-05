import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  CheckCircle2, XCircle, AlertCircle, ChevronRight, ChevronLeft,
  NotebookPen, Flag, X, EyeOff, Eye, Eraser, Info, Sparkles, StickyNote,
  GraduationCap, BookOpen, Hand, MousePointerClick, ChevronDown, ChevronUp,
  FileText, Play, Trophy, Search, Award, Home
} from 'lucide-react';

// IMPORTAÇÕES LOCAIS (que faremos a seguir)
import FilterScreen from './FilterScreen';
import questionsDataRaw from './data.json'; 

// ============================================================================
// 1. TIPAGENS INTEGRADAS
// ============================================================================
export interface Question {
  id: number;
  ano: string;
  banca?: string;
  categoria: string;
  tema_especifico: string;
  enunciado: string;
  a?: string; b?: string; c?: string; d?: string; e?: string;
  alternativas?: any; 
  correta: string;
  comentario: string;
  origem: string;
  justificativa_a?: string; justificativa_b?: string; justificativa_c?: string;
  justificativa_d?: string; justificativa_e?: string;
  especialidade?: string;
  competencias?: string; 
}

export interface FilterState {
  categorias: string[]; temas_especificos: string[]; anos: string[];
  origens: string[]; searchQueries: string[]; excludeCorrect: boolean;
  excludeSeen: boolean; onlyWrong?: boolean; especialidades?: string[];
  competencias?: string[];
}

export interface UserHistoryItem {
  questionId: number; isCorrect: boolean; userAnswer: string;
  timestamp: number; category?: string; especialidade?: string;
  tema_especifico?: string; competencia?: string;
}

export interface QuestionSessionState {
  selectedOption: string | null; isSubmitted: boolean; isCommentExpanded: boolean;
  isSkipped?: boolean; eliminatedOptions?: string[];
  highlights?: { start: number; end: number; text: string }[];
}

export type AppView = 'home' | 'exams' | 'quiz' | 'results';

// ============================================================================
// 2. STORAGE SERVICES (LOCALSTORAGE)
// ============================================================================
const HISTORY_KEY = 'apexmed_lite_history';

export const getUserHistory = (): UserHistoryItem[] => {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); } catch { return []; }
};

export const saveUserAnswer = (item: UserHistoryItem): void => {
  try {
    const history = getUserHistory();
    history.push(item);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  } catch (e) { console.error("Erro ao salvar", e); }
};

const CATEGORY_MAP: Record<string, string> = {
  'CB': 'Ciclo Básico', 'CC': 'Clínica Cirúrgica', 'CM': 'Clínica Médica',
  'GO': 'Ginecologia e Obstetrícia', 'PED': 'Pediatria', 'SC': 'Saúde Coletiva',
  'PREV': 'Medicina Preventiva', 'SM': 'Saúde Mental',
};

// ============================================================================
// 3. COMPONENTE: EXAMS SCREEN (Design Original Preservado)
// ============================================================================
interface ExamsScreenProps {
  questions: Question[]; history: UserHistoryItem[];
  onStartExam: (origem: string, ano: string, total: number) => void;
}

const ExamsScreen: React.FC<ExamsScreenProps> = ({ questions, history, onStartExam }) => {
  const [selectedExam, setSelectedExam] = useState<any | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const availableExams = useMemo(() => {
    const groups: Record<string, { count: number, ids: number[] }> = {};
    questions.forEach(q => {
      if (q.origem && q.ano && q.origem.trim().toLowerCase() !== 'desconhecido') {
        const key = `${q.origem} - ${q.ano}`; 
        if (!groups[key]) groups[key] = { count: 0, ids: [] };
        groups[key].count++; groups[key].ids.push(q.id);
      }
    });

    const exams: any[] = [];
    const historyMap = new Map(history.map(h => [h.questionId, h.isCorrect]));

    Object.entries(groups).forEach(([key, data]) => {
      if (data.count >= 10) { // Reduzido para 10 para facilitar testes locais
        const [origem, ano] = key.split(' - ');
        let correctCount = 0, doneCount = 0;
        data.ids.forEach(qid => {
          if (historyMap.has(qid)) { doneCount++; if (historyMap.get(qid)) correctCount++; }
        });
        exams.push({
          id: key, origem, ano, count: data.count, userCorrect: correctCount,
          userTotalDone: doneCount, score: doneCount > 0 ? Math.round((correctCount / doneCount) * 100) : 0,
          isComplete: doneCount === data.count
        });
      }
    });
    return exams.sort((a, b) => a.origem.localeCompare(b.origem) || Number(b.ano) - Number(a.ano));
  }, [questions, history]);

  const displayedExams = useMemo(() => searchTerm.trim() ? availableExams.filter(e => e.origem.toLowerCase().includes(searchTerm.toLowerCase()) || e.ano.includes(searchTerm.toLowerCase())) : availableExams, [availableExams, searchTerm]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8 pb-32 animate-in fade-in duration-500 font-sans">
      <div className="text-center py-6 max-w-2xl mx-auto space-y-6">
        <h1 className="text-3xl md:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-4">Provas na <span className="text-[#BD4234]">Íntegra</span></h1>
        <div className="relative group z-10">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400"><Search size={18} /></div>
          <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Buscar banca (ex: ENARE) ou ano..." className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl py-3.5 pl-11 pr-12 text-sm text-slate-900 dark:text-white outline-none focus:border-[#BD4234] shadow-sm transition-all" />
          {searchTerm && <button onClick={() => setSearchTerm('')} className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-[#BD4234]"><X size={18} /></button>}
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {displayedExams.map((exam) => (
          <button key={exam.id} onClick={() => setSelectedExam(exam)} className="group relative bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm hover:border-[#BD4234]/50 transition-all text-left flex flex-col h-[240px]">
            {exam.isComplete && <div className="absolute top-3 right-3 text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 p-1.5 rounded-md"><CheckCircle2 size={16} strokeWidth={2.5} /></div>}
            <div className="flex justify-between items-start mb-4">
              <div className="inline-flex flex-col items-center justify-center w-12 h-12 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-100 group-hover:bg-[#BD4234] group-hover:text-white transition-colors"><span className="text-[9px] font-bold uppercase opacity-70">Ano</span><span className="text-sm font-black">{exam.ano}</span></div>
              {exam.score > 0 && <div className={`flex flex-col items-end ${exam.score >= 70 ? 'text-emerald-600' : 'text-amber-600'}`}><div className="flex items-center gap-1 font-bold text-sm"><Trophy size={14} /> {exam.score}%</div><span className="text-[9px] uppercase opacity-70">Aproveitamento</span></div>}
            </div>
            <div className="space-y-1 mt-auto mb-4"><p className="text-[10px] font-semibold text-slate-400 uppercase flex items-center gap-1"><BookOpen size={12} /> Banca</p><h3 className="text-lg font-bold text-slate-800 dark:text-white line-clamp-2">{exam.origem}</h3></div>
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
              <div className="flex justify-between text-xs font-medium text-slate-500 mb-2"><span className="flex items-center gap-1.5"><FileText size={14}/> {exam.count} Questões</span><span>{Math.round((exam.userTotalDone / exam.count) * 100)}%</span></div>
              <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden"><div className="h-full bg-[#BD4234] transition-all" style={{ width: `${(exam.userTotalDone / exam.count) * 100}%` }} /></div>
            </div>
          </button>
        ))}
      </div>
      {selectedExam && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"><div className="bg-white dark:bg-slate-900 rounded-xl p-6 max-w-sm w-full text-center"><div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-900/20 rounded-full flex items-center justify-center mx-auto mb-4 text-[#BD4234]"><Award size={32} /></div><h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Iniciar Simulado?</h2><p className="text-slate-500 mb-6 text-sm">Prova <strong>{selectedExam.origem} {selectedExam.ano}</strong> com {selectedExam.count} questões.</p><div className="space-y-3"><button onClick={() => { onStartExam(selectedExam.origem, selectedExam.ano, selectedExam.count); setSelectedExam(null); }} className="w-full py-3 bg-[#BD4234] text-white rounded-lg font-semibold text-sm flex justify-center items-center gap-2"><Play size={16} /> Iniciar Agora</button><button onClick={() => setSelectedExam(null)} className="w-full py-3 bg-white dark:bg-slate-800 border text-slate-600 dark:text-slate-300 rounded-lg font-semibold text-sm">Cancelar</button></div></div></div>
      )}
    </div>
  );
};

// ============================================================================
// 4. COMPONENTE: QUESTION CARD (Lógica Desacoplada e UI Original)
// ============================================================================
const JustificationAccordion = ({ letter, text }: { letter: string, text: string }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden bg-white dark:bg-zinc-900 mb-3 shadow-sm">
      <button onClick={() => setIsOpen(!isOpen)} className="w-full flex items-center justify-between p-4 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"><div className="flex items-center gap-3"><span className="flex items-center justify-center w-8 h-8 rounded-full bg-rose-100 text-rose-600 text-sm font-bold">{letter}</span><span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Por que a {letter} está incorreta?</span></div>{isOpen ? <ChevronUp size={18} className="text-zinc-400"/> : <ChevronDown size={18} className="text-zinc-400"/>}</button>
      {isOpen && <div className="p-5 text-sm md:text-base text-zinc-600 dark:text-zinc-300 bg-white dark:bg-zinc-900 border-t">{text}</div>}
    </div>
  );
};

const QuestionCard: React.FC<any> = ({ question, currentIndex, totalQuestions, onNext, onAnswer, savedState, onStateChange, onBack, isLastQuestion, onFinish }) => {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [eliminatedOptions, setEliminatedOptions] = useState<string[]>([]);
  const [highlights, setHighlights] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const enunciadoRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (savedState) { setSelectedOption(savedState.selectedOption); setIsSubmitted(savedState.isSubmitted); setEliminatedOptions(savedState.eliminatedOptions || []); setHighlights(savedState.highlights || []); } 
    else { setSelectedOption(null); setIsSubmitted(false); setEliminatedOptions([]); setHighlights([]); }
  }, [question.id, savedState]);

  useEffect(() => { if (onStateChange) onStateChange({ selectedOption, isSubmitted, isCommentExpanded: true, eliminatedOptions, highlights }); }, [selectedOption, isSubmitted, eliminatedOptions, highlights]);

  const gabaritoRaw = question.correta ? question.correta.toUpperCase() : '';
  const correctKeys = useMemo(() => gabaritoRaw.split('/').map((k: string) => k.trim()), [gabaritoRaw]);
  const categoryDisplay = CATEGORY_MAP[question.categoria] || question.categoria;
  const isUserCorrect = useMemo(() => selectedOption && correctKeys.includes(selectedOption.toUpperCase()), [selectedOption, correctKeys]);

  const optionsList = useMemo(() => {
    let map: Record<string, string> = {};
    if (question.a) map['A'] = question.a; if (question.b) map['B'] = question.b; if (question.c) map['C'] = question.c; if (question.d) map['D'] = question.d; if (question.e) map['E'] = question.e;
    return Object.entries(map).map(([key, text]) => ({ key: key.toUpperCase(), text })).filter(o => o.text);
  }, [question]);

  const handleSubmit = () => {
    if (!selectedOption || isSubmitting || isSubmitted) return;
    setIsSubmitting(true);
    const isCorrect = correctKeys.includes(selectedOption.toUpperCase());
    onAnswer(isCorrect);
    setIsSubmitted(true);
    setIsSubmitting(false);
  };

  const toggleElimination = (key: string) => {
    if (isSubmitted) return;
    setEliminatedOptions(p => {
      if (p.includes(key)) return p.filter(k => k !== key);
      if (selectedOption === key) setSelectedOption(null);
      return [...p, key];
    });
  };

  const getOptionStyles = (key: string) => {
    const isSelected = selectedOption === key; const isEliminated = eliminatedOptions.includes(key); const isCorrectKey = correctKeys.includes(key); 
    let container = "group relative flex items-start md:items-center gap-4 p-5 rounded-[1.25rem] border-2 transition-all cursor-pointer text-base select-none ";
    let circle = "mt-0.5 md:mt-0 flex items-center justify-center w-7 h-7 rounded-full border-[2px] flex-shrink-0 text-xs font-black ";
    let textStyle = "leading-relaxed flex-1 font-medium ";
    if (isSubmitted) {
        if (isCorrectKey) { container += "bg-emerald-50 border-emerald-500 "; circle += "bg-emerald-600 border-emerald-600 text-white "; textStyle += "text-emerald-900 font-bold "; } 
        else if (isSelected) { container += "bg-rose-50 border-rose-500 "; circle += "bg-rose-500 border-rose-500 text-white "; textStyle += "text-rose-900 "; } 
        else { container += "opacity-60 bg-white border-zinc-100 "; circle += "border-zinc-200 "; textStyle += "text-zinc-400 "; }
    } else {
        if (isEliminated) { container += "opacity-50 grayscale bg-zinc-50 border-zinc-100 "; circle += "border-zinc-200 text-zinc-300 "; textStyle += "line-through text-zinc-400 decoration-zinc-400/50 "; } 
        else if (isSelected) { container += "bg-white border-indigo-600 ring-4 ring-indigo-50 shadow-lg "; circle += "bg-indigo-600 border-indigo-600 text-white "; textStyle += "text-indigo-900 font-semibold "; } 
        else { container += "bg-white border-zinc-200 hover:border-indigo-300 hover:bg-zinc-50 "; circle += "border-zinc-300 text-zinc-400 group-hover:border-indigo-400 group-hover:text-indigo-500 "; textStyle += "text-zinc-600 group-hover:text-zinc-900 "; }
    }
    return { container, circle, text: textStyle };
  };

  return (
    <div className="h-full w-full overflow-y-auto bg-[#FDFDFD] dark:bg-[#09090b] flex flex-col items-center font-sans pb-32">
      <div className="w-full max-w-[900px] p-6 space-y-8">
        <div className="flex flex-col gap-4 w-full">
          <div className="flex justify-between items-center"><span className="font-mono text-xs font-bold text-zinc-400 bg-zinc-100 px-3 py-1.5 rounded-lg">{String(currentIndex + 1).padStart(2, '0')} / {totalQuestions}</span></div>
          <div className="flex flex-wrap items-center gap-3 text-xs md:text-sm font-medium text-zinc-500 border-b border-zinc-100 pb-4">
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-100 rounded-full"><GraduationCap size={14}/><span className="text-zinc-900 font-bold">{question.origem}</span></div>
            <span className="font-semibold">{question.ano}</span>
            <div className="flex items-center gap-1.5"><BookOpen size={14}/><span className="uppercase text-[11px]">{categoryDisplay}</span></div>
          </div>
        </div>
        <div className="text-[1.25rem] leading-[1.8] text-zinc-800 font-medium">{question.enunciado}</div>
        <div className="flex flex-col gap-3 mt-6">
          {optionsList.map((opt) => {
            const styles = getOptionStyles(opt.key); const isEliminated = eliminatedOptions.includes(opt.key); const isSelected = selectedOption === opt.key;
            return (
              <div key={opt.key} onClick={() => !isEliminated && !isSubmitted && setSelectedOption(opt.key)} className={styles.container}>
                <div className={styles.circle}>{isEliminated ? <EyeOff size={14}/> : isSubmitted && correctKeys.includes(opt.key) ? <CheckCircle2 size={16}/> : isSubmitted && isSelected ? <XCircle size={16}/> : opt.key}</div>
                <div className={styles.text}>{opt.text}</div>
                {!isSubmitted && ( <button onClick={(e) => { e.stopPropagation(); toggleElimination(opt.key); }} className={`absolute right-4 p-2 rounded-full border ${isEliminated ? "opacity-100 bg-white text-zinc-400" : "bg-white border-zinc-100 text-zinc-300 opacity-0 md:group-hover:opacity-100"} `}>{isEliminated ? <Eye size={18}/> : <EyeOff size={18}/>}</button> )}
              </div>
            );
          })}
        </div>
        {isSubmitted && (
          <div className="mt-8 rounded-[2rem] bg-zinc-50/50 border border-zinc-200 overflow-hidden">
            <div className={`px-6 py-4 border-b flex items-center gap-3 ${isUserCorrect ? 'border-emerald-100' : 'border-rose-100'}`}><div className={`p-1.5 rounded-lg ${isUserCorrect ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}><Sparkles size={18}/></div><h3 className="font-bold">{isUserCorrect ? 'Você acertou! Confira o comentário:' : 'Resposta Incorreta. Veja a justificativa:'}</h3></div>
            <div className="p-6 md:p-8 space-y-6">
              <div className="mb-8"><p className="whitespace-pre-wrap leading-loose text-zinc-600">{question.comentario}</p></div>
              <div className="space-y-3">
                {optionsList.map(opt => { if (correctKeys.includes(opt.key)) return null; const just = (question as any)[`justificativa_${opt.key.toLowerCase()}`]; return just ? <JustificationAccordion key={opt.key} letter={opt.key} text={just} /> : null; })}
              </div>
            </div>
          </div>
        )}
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-white/90 p-2 rounded-full shadow-2xl border z-40">
          {onBack && <button onClick={onBack} className="w-11 h-11 flex items-center justify-center rounded-full hover:bg-zinc-100 text-zinc-400"><ChevronLeft size={20}/></button>}
          {!isSubmitted ? <button onClick={handleSubmit} disabled={!selectedOption || isSubmitting} className="bg-zinc-900 text-white px-10 py-3 rounded-full font-bold disabled:opacity-50 shadow-xl">{isSubmitting ? '...' : 'Responder'}</button> : onNext && !isLastQuestion ? <button onClick={onNext} className="bg-indigo-600 text-white px-10 py-3 rounded-full font-bold shadow-lg flex gap-2">Próxima <ChevronRight size={18}/></button> : <button onClick={onFinish} className="bg-rose-600 text-white px-10 py-3 rounded-full font-bold shadow-lg flex gap-2">Finalizar <AlertCircle size={18}/></button>}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 5. APP ROUTER (Orquestrador Principal)
// ============================================================================
export default function App() {
  const [currentView, setCurrentView] = useState<AppView>('home');
  const [questions, setQuestions] = useState<Question[]>(questionsDataRaw as Question[]);
  const [history, setHistory] = useState<UserHistoryItem[]>([]);
  const [activeQuestions, setActiveQuestions] = useState<Question[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [sessionState, setSessionState] = useState<Record<number, QuestionSessionState>>({});
  const [filters, setFilters] = useState<FilterState>({ categorias: [], temas_especificos: [], anos: [], origens: [], searchQueries: [], excludeCorrect: false, excludeSeen: false });

  useEffect(() => { setHistory(getUserHistory()); }, []);

  const handleStartQuiz = useCallback((limit: number, randomize: boolean, smartSelection: boolean, ids?: number[]) => {
    let selected = ids ? ids.map(id => questions.find(q => q.id === id)).filter(Boolean) as Question[] : [...questions].sort(() => Math.random() - 0.5).slice(0, limit);
    setActiveQuestions(selected); setSessionState({}); setCurrentPage(1); setCurrentView('quiz');
  }, [questions]);

  const handleStartExam = useCallback((origem: string, ano: string) => {
    setActiveQuestions(questions.filter(q => q.origem === origem && q.ano === ano)); setSessionState({}); setCurrentPage(1); setCurrentView('quiz');
  }, [questions]);

  const handleAnswer = useCallback((isCorrect: boolean) => {
    const q = activeQuestions[currentPage - 1];
    if (!q) return;
    const item: UserHistoryItem = { questionId: q.id, isCorrect, userAnswer: isCorrect ? q.correta : 'ERR', timestamp: Date.now(), category: q.categoria };
    saveUserAnswer(item); setHistory(p => [...p, item]);
  }, [activeQuestions, currentPage]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans">
      {currentView === 'home' && <FilterScreen questions={questions} history={history} filters={filters} setFilters={setFilters} onStartQuiz={handleStartQuiz} />}
      {currentView === 'exams' && <ExamsScreen questions={questions} history={history} onStartExam={handleStartExam} />}
      {currentView === 'quiz' && <QuestionCard question={activeQuestions[currentPage - 1]} currentIndex={currentPage - 1} totalQuestions={activeQuestions.length} savedState={sessionState[activeQuestions[currentPage - 1]?.id]} onStateChange={(s: any) => setSessionState(p => ({ ...p, [activeQuestions[currentPage - 1]?.id]: s }))} onAnswer={handleAnswer} onNext={() => setCurrentPage(p => p + 1)} onBack={currentPage > 1 ? () => setCurrentPage(p => p - 1) : undefined} isLastQuestion={currentPage === activeQuestions.length} onFinish={() => setCurrentView('home')} />}
      
      {/* NAVBAR MOBILE */}
      {currentView !== 'quiz' && (
        <nav className="fixed bottom-0 left-0 right-0 bg-white/80 border-t z-50">
          <div className="flex justify-around items-center h-16 max-w-md mx-auto">
            <button onClick={() => setCurrentView('home')} className={`p-2 rounded-xl transition-all ${currentView === 'home' ? 'text-[#BD4234] bg-red-50' : 'text-slate-400'}`}><Home size={24} /></button>
            <button onClick={() => setCurrentView('exams')} className={`p-2 rounded-xl transition-all ${currentView === 'exams' ? 'text-[#BD4234] bg-red-50' : 'text-slate-400'}`}><FileText size={24} /></button>
          </div>
        </nav>
      )}
    </div>
  );
}
