import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Question, QuestionSessionState, AppView } from './types';
import { 
  CheckCircle2, XCircle, AlertCircle, ChevronRight, ChevronLeft, 
  NotebookPen, Flag, X, EyeOff, Eye, Eraser, Info, Sparkles, StickyNote, 
  GraduationCap, BookOpen, Hand, MousePointerClick, ChevronDown, ChevronUp
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
// ✅ ADICIONADO: Importação do serviço para salvar no banco
import { saveUserAnswer } from '../services/userHistoryService';

// Mapeamento de categorias
const CATEGORY_MAP: Record<string, string> = {
  'CB': 'Ciclo Básico',
  'CC': 'Clínica Cirúrgica',
  'CM': 'Clínica Médica',
  'GO': 'Ginecologia e Obstetrícia',
  'PED': 'Pediatria',
  'SC': 'Saúde Coletiva',
  'PREV': 'Medicina Preventiva',
};

interface QuestionCardProps {
  question: Question;
  currentIndex: number;
  totalQuestions: number;
  onNext?: () => void;
  onAnswer?: (isCorrect: boolean) => void;
  savedState?: QuestionSessionState;
  onStateChange?: (state: QuestionSessionState) => void;
  onBack?: () => void;
  onSkip?: () => void;
  isLastQuestion?: boolean;
  onFinish?: () => void;
  onNavigate?: (view: AppView) => void; 
}

// --- SUB-COMPONENT: JUSTIFICATION ACCORDION ---
const JustificationAccordion = ({ letter, text }: { letter: string, text: string }) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden bg-white dark:bg-zinc-900 mb-3 shadow-sm">
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-800/40 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
                <div className="flex items-center gap-3">
                    <span className="flex items-center justify-center w-8 h-8 rounded-full bg-rose-100 text-rose-600 dark:bg-rose-900/40 dark:text-rose-400 text-sm font-bold border border-rose-200 dark:border-rose-800">
                        {letter}
                    </span>
                    <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 text-left">
                        Por que a alternativa {letter} está incorreta?
                    </span>
                </div>
                {isOpen ? <ChevronUp size={18} className="text-zinc-400"/> : <ChevronDown size={18} className="text-zinc-400"/>}
            </button>
            
            {isOpen && (
                <div className="p-5 text-sm md:text-base text-zinc-600 dark:text-zinc-300 leading-relaxed bg-white dark:bg-zinc-900 border-t border-zinc-100 dark:border-zinc-800 animate-in slide-in-from-top-1">
                    {text}
                </div>
            )}
        </div>
    );
};

// --- TUTORIAL MODAL (GUIA RÁPIDO) ---
const TutorialInfoModal = ({ onClose }: { onClose: () => void }) => {
  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-zinc-50/90 dark:bg-black/90 backdrop-blur-xl animate-in fade-in duration-300 font-sans">
      <div className="bg-white dark:bg-zinc-900 w-full max-w-2xl rounded-[2rem] border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
        <div className="p-8 text-center border-b border-zinc-100 dark:border-zinc-800">
             <div className="w-14 h-14 bg-zinc-100 dark:bg-zinc-800 rounded-2xl flex items-center justify-center mx-auto mb-5">
                <Sparkles size={28} className="text-zinc-900 dark:text-white" />
             </div>
             <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2 tracking-tight">Guia Rápido</h2>
             <p className="text-zinc-500 dark:text-zinc-400 text-sm">Domine todas as ferramentas da plataforma.</p>
        </div>
        
        {/* Grid 2x2 para mostrar todas as funcionalidades */}
        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-zinc-100 dark:divide-zinc-800">
             <div className="flex flex-col divide-y divide-zinc-100 dark:divide-zinc-800">
                 <div className="p-5 flex items-start gap-4 text-left">
                    <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg text-indigo-600 dark:text-indigo-400 shrink-0">
                        <MousePointerClick size={18} />
                    </div>
                    <div>
                        <h3 className="font-bold text-zinc-900 dark:text-white text-sm mb-1">Ocultar Alternativa</h3>
                        <p className="text-xs text-zinc-500 leading-relaxed">
                            Clique no ícone de "olho" (mobile) ou passe o mouse (desktop) para esconder opções absurdas.
                        </p>
                    </div>
                 </div>
                 <div className="p-5 flex items-start gap-4 text-left">
                    <div className="p-2 bg-rose-50 dark:bg-rose-900/20 rounded-lg text-rose-600 dark:text-rose-400 shrink-0">
                        <Hand size={18} />
                    </div>
                    <div>
                        <h3 className="font-bold text-zinc-900 dark:text-white text-sm mb-1">Swipe / Eliminar</h3>
                        <p className="text-xs text-zinc-500 leading-relaxed">
                            No celular, arraste a alternativa para a <strong>esquerda</strong> para riscar ela instantaneamente.
                        </p>
                    </div>
                 </div>
             </div>

             <div className="flex flex-col divide-y divide-zinc-100 dark:divide-zinc-800">
                 <div className="p-5 flex items-start gap-4 text-left">
                    <div className="p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-amber-600 dark:text-amber-400 shrink-0">
                        <StickyNote size={18} />
                    </div>
                    <div>
                        <h3 className="font-bold text-zinc-900 dark:text-white text-sm mb-1">Caderno de Erros</h3>
                        <p className="text-xs text-zinc-500 leading-relaxed">
                            Use o ícone de nota no topo para salvar observações pessoais sobre a questão.
                        </p>
                    </div>
                 </div>
                 <div className="p-5 flex items-start gap-4 text-left">
                    <div className="p-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-zinc-600 dark:text-zinc-400 shrink-0">
                        <Flag size={18} />
                    </div>
                    <div>
                        <h3 className="font-bold text-zinc-900 dark:text-white text-sm mb-1">Reportar Erro</h3>
                        <p className="text-xs text-zinc-500 leading-relaxed">
                            Encontrou algo errado? Nos avise clicando na bandeira para corrigirmos rápido.
                        </p>
                    </div>
                 </div>
             </div>
        </div>

        <div className="p-4 bg-zinc-50 dark:bg-zinc-950/50 border-t border-zinc-100 dark:border-zinc-800">
            <button onClick={onClose} className="w-full py-3.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-bold rounded-xl hover:opacity-90 transition-opacity shadow-lg text-sm">
                Entendi, vamos lá!
            </button>
        </div>
      </div>
    </div>
  );
};

// --- COMPONENTE DO MODAL DE BLOQUEIO (PREMIUM) ---
interface PremiumLockModalProps {
    onNavigate?: (view: AppView) => void;
    planType?: string;
    questionsUsed?: number;
    questionsLimit?: number;
}

const PremiumLockModal = ({ onNavigate, planType = 'free', questionsUsed = 0, questionsLimit = 10 }: PremiumLockModalProps) => {
    const isTesteOtimizado = planType === 'teste_otimizado';

    const handleNavigateToSales = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (onNavigate) {
            onNavigate('sales');
        }
    };

    const handleBackToHome = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (onNavigate) {
            onNavigate('home');
        } else {
            window.location.reload();
        }
    };

    return (
        <div 
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-md animate-in fade-in duration-300"
            onClick={(e) => e.stopPropagation()}
        >
            <div 
                className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2rem] shadow-2xl overflow-hidden text-center relative border border-slate-200 dark:border-slate-800"
                onClick={(e) => e.stopPropagation()}
            >
                <div className={`p-8 text-white relative overflow-hidden ${isTesteOtimizado ? 'bg-blue-600' : 'bg-[#C04A3A]'}`}>
                     <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -mr-8 -mt-16"></div>
                     <div className="relative z-10">
                        <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-4">
                            <Sparkles size={32} className="text-white" />
                        </div>
                        <h2 className="text-2xl font-black mb-1">
                            {isTesteOtimizado ? 'Pacote Esgotado!' : 'Limite Diário Atingido'}
                        </h2>
                        <p className={`font-medium text-sm ${isTesteOtimizado ? 'text-blue-100' : 'text-red-100'}`}>
                            {isTesteOtimizado ? 'Você aproveitou bem o teste!' : 'Você mandou bem hoje!'}
                        </p>
                     </div>
                </div>
                
                <div className="p-8 space-y-6">
                    <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed">
                        {isTesteOtimizado ? (
                            <>
                                Você usou todas as <strong>{questionsLimit} questões</strong> do seu pacote Teste Otimizado. 
                                Para continuar praticando sem limites, faça upgrade para o plano Premium!
                            </>
                        ) : (
                            <>
                                Você atingiu o limite de <strong>10 questões diárias</strong> do plano gratuito. 
                                Para continuar praticando sem limites e desbloquear todo o potencial do Quest, torne-se Premium.
                            </>
                        )}
                    </p>
                    
                    <div className="space-y-3">
                        <button 
                            type="button"
                            onClick={handleNavigateToSales}
                            className={`block w-full py-4 text-white font-bold rounded-xl shadow-lg transition-all active:scale-95 cursor-pointer ${
                                isTesteOtimizado 
                                    ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-900/20' 
                                    : 'bg-[#C04A3A] hover:bg-[#9a3b2e] shadow-red-900/20'
                            }`}
                        >
                            Quero Acesso Ilimitado
                        </button>
                        
                        <button 
                            type="button"
                            onClick={handleBackToHome}
                            className="block w-full py-4 text-slate-500 dark:text-slate-400 font-bold text-xs hover:text-slate-800 dark:hover:text-white transition-colors cursor-pointer"
                        >
                            Voltar para o Início
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const QuestionCard: React.FC<QuestionCardProps> = ({ 
  question, currentIndex, totalQuestions, onNext, onAnswer, savedState, onStateChange, onBack, isLastQuestion, onFinish, onNavigate
}) => {
  const { user } = useAuth();
  
  // --- ESTADOS ---
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isCommentExpanded, setIsCommentExpanded] = useState(false); 
  const [eliminatedOptions, setEliminatedOptions] = useState<string[]>([]);
  const [highlights, setHighlights] = useState<{start: number, end: number, text: string}[]>([]);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  // ✨ NOVO: Estado para bloquear cliques múltiplos
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const enunciadoRef = useRef<HTMLDivElement>(null);
  const lastTap = useRef<number>(0); 
  
  const touchStartRef = useRef<number | null>(null);
  const touchEndRef = useRef<number | null>(null);

  const [showNotes, setShowNotes] = useState(false);
  const [userNote, setUserNote] = useState('');
  const [isNoteSaved, setIsNoteSaved] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportCategory, setReportCategory] = useState('erro-gabarito');
  const [isReporting, setIsReporting] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);

  // --- INIT & PERSISTÊNCIA ---
  useEffect(() => {
      const hasSeenTutorial = localStorage.getItem('tutorial_focus_v2_updated');
      if (!hasSeenTutorial) setShowTutorial(true);
  }, []);

  const closeTutorial = () => {
      localStorage.setItem('tutorial_focus_v2_updated', 'true');
      setShowTutorial(false);
  };

  useEffect(() => {
    if (savedState) {
      setSelectedOption(savedState.selectedOption);
      setIsSubmitted(savedState.isSubmitted);
      setIsCommentExpanded(savedState.isCommentExpanded);
      setEliminatedOptions(savedState.eliminatedOptions || []);
      setHighlights(savedState.highlights || []);
    } else {
      setSelectedOption(null);
      setIsSubmitted(false);
      setIsCommentExpanded(false);
      setEliminatedOptions([]);
      setHighlights([]);
      setShowPremiumModal(false);
    }
    
    const allNotes = JSON.parse(localStorage.getItem('questbank_user_notes') || '{}');
    setUserNote(allNotes[question.id] || '');
    setShowNotes(!!allNotes[question.id]);
    
  }, [question.id]);

  useEffect(() => {
    if (onStateChange) {
        onStateChange({ 
            selectedOption, 
            isSubmitted, 
            isCommentExpanded, 
            isSkipped: false, 
            eliminatedOptions, 
            highlights 
        });
    }
  }, [selectedOption, isSubmitted, isCommentExpanded, eliminatedOptions, highlights]);

  // --- LOGICA GABARITO ---
  const gabaritoRaw = question.correta ? question.correta.toUpperCase() : '';
  const isAnulada = gabaritoRaw.includes('ANULADA') || gabaritoRaw.includes('EXCLUIDA');
  const correctKeys = useMemo(() => isAnulada ? [] : gabaritoRaw.split('/').map(k => k.trim()), [gabaritoRaw, isAnulada]);
  const categoryDisplay = CATEGORY_MAP[question.categoria] || question.categoria;

  const isUserCorrect = useMemo(() => {
      if (!selectedOption) return false;
      return isAnulada || correctKeys.includes(selectedOption.toUpperCase());
  }, [selectedOption, isAnulada, correctKeys]);

  const optionsList = useMemo(() => {
    if (!question) return [];
    let map: Record<string, string> = {};
    if (question.a || question.b || question.c || question.d || question.e) {
        if(question.a) map['A'] = question.a;
        if(question.b) map['B'] = question.b;
        if(question.c) map['C'] = question.c;
        if(question.d) map['D'] = question.d;
        if(question.e) map['E'] = question.e;
    } else if (question.alternativas) {
       try {
        const parsed = typeof question.alternativas === 'string' ? JSON.parse(question.alternativas) : question.alternativas;
        if (Array.isArray(parsed)) {
            const letters = ['A', 'B', 'C', 'D', 'E'];
            parsed.forEach((text, i) => { if(letters[i] && text) map[letters[i]] = text; });
        } else { map = parsed || {}; }
       } catch (e) { map = {}; }
    }
    return Object.entries(map).map(([key, text]) => ({ key: key ? String(key).toUpperCase() : '?', text })).filter(o => o.text && o.key !== '?');
  }, [question]);

  // --- ACTIONS ---
  const handleOptionSelect = (key: string) => { 
      if (!isSubmitted && !eliminatedOptions.includes(key)) setSelectedOption(key); 
  };
  
  // Extrair informações do plano do usuário
  const userPlanType = user?.profile?.planType || user?.profile?.plan_type || 'free';
  const userQuestionsLimit = user?.profile?.questionsLimit || user?.profile?.questions_limit || (userPlanType === 'teste_otimizado' ? 200 : 10);
  const userQuestionsAnswered = user?.profile?.questionsAnswered || user?.profile?.questions_answered || 0;

  const handleSubmit = async () => {
    // ✨ NOVO: Bloqueio de submissão duplicada (Anti-Spam Client Side)
    if (!selectedOption || isSubmitting || isSubmitted) return;

    setIsSubmitting(true); // Trava o botão

    try {
        // --- LÓGICA DE VERIFICAÇÃO DE LIMITE ---
        if (user) {
            try {
                // console.log('🔍 [DEBUG] Chamando check_can_answer para user:', user?.id);

                // Como alteramos a assinatura da RPC no passo anterior, remova o argumento:
                const { data, error } = await supabase.rpc('check_can_answer');

                // console.log('📊 [DEBUG] Resposta da RPC:', { ... });

                if (error) {
                    console.error("❌ Erro ao verificar limite:", error);
                }

                if (data && data.allowed === false) {
                    // console.warn('🚫 Limite atingido. Mostrando modal.');
                    setShowPremiumModal(true);
                    setIsSubmitting(false); // Libera para tentar de novo se fechar o modal
                    return;
                }
            } catch (err) {
                console.error("Exceção na verificação de limite:", err);
            }
        }
        // ----------------------------------------

        // ✅ CORREÇÃO: Salvar no banco de dados com tratamento de erro P0001
        const isCorrect = isAnulada || correctKeys.includes(selectedOption.toUpperCase());
        
        if (user) {
            try {
                await saveUserAnswer(
                    user.id, 
                    question.id, 
                    isCorrect, 
                    selectedOption, 
                    question.categoria
                );
            } catch (err: any) {
                // 🛡️ TRATAMENTO SILENCIOSO DE ERRO P0001 (ANTI-SPAM)
                // Se for "Aguarde alguns segundos...", apenas ignoramos/avisamos no console
                if (err.code === 'P0001' || err.message?.includes('Aguarde alguns segundos')) {
                    console.warn("⚠️ Clique duplo prevenido pelo sistema (Anti-Spam).");
                } else {
                    console.error("❌ Erro real ao salvar resposta:", err);
                }
            }
        }

        setIsSubmitted(true);
        setIsCommentExpanded(true); 
        if (onAnswer) onAnswer(isCorrect);

    } catch (err) {
        console.error("Erro inesperado no submit:", err);
    } finally {
        setIsSubmitting(false); // Libera o estado
    }
  };

  const toggleElimination = (key: string) => {
    if (isSubmitted) return;
    setEliminatedOptions(prev => {
      if (prev.includes(key)) return prev.filter(k => k !== key); 
      if (selectedOption === key) setSelectedOption(null); 
      return [...prev, key];
    });
  };

  const handleTouchStart = (e: React.TouchEvent) => {
      touchEndRef.current = null;
      touchStartRef.current = e.targetTouches[0].clientX;
  };
  const handleTouchMove = (e: React.TouchEvent) => {
      touchEndRef.current = e.targetTouches[0].clientX;
  };
  const handleTouchEnd = (key: string) => {
      if (!touchStartRef.current || !touchEndRef.current) return;
      const distance = touchStartRef.current - touchEndRef.current;
      const isLeftSwipe = distance > 50; 
      if (isLeftSwipe && !isSubmitted) {
          if (!eliminatedOptions.includes(key)) {
             toggleElimination(key);
          }
      }
      touchStartRef.current = null;
      touchEndRef.current = null;
  };

  // --- REPORT & NOTES ---
  const handleReportSubmit = async () => {
    if (!reportReason.trim()) return alert("Por favor, descreva o problema.");
    setIsReporting(true);
    setTimeout(() => { setIsReporting(false); setShowReportModal(false); setReportReason(''); alert("Reportado com sucesso."); }, 800);
  };

  const handleSaveNote = useCallback(() => {
    const allNotes = JSON.parse(localStorage.getItem('questbank_user_notes') || '{}');
    if (userNote.trim()) allNotes[question.id] = userNote; else delete allNotes[question.id];
    localStorage.setItem('questbank_user_notes', JSON.stringify(allNotes));
    setIsNoteSaved(true); setTimeout(() => setIsNoteSaved(false), 2000);
  }, [userNote, question.id]);

  // --- HIGHLIGHTS ---
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
        const newHighlights = [...prev, { start, end, text }].sort((a, b) => a.start - b.start);
        selection.removeAllRanges(); return newHighlights;
      });
    }
  }, []);

  const renderedEnunciado = useMemo(() => {
    const text = question.enunciado || (question as any).pergunta || "Enunciado indisponível."; 
    if (highlights.length === 0) return text;
    const parts = []; let lastIndex = 0;
    highlights.forEach((h, idx) => {
      if (h.start > lastIndex) parts.push(<span key={`t-${idx}`}>{text.substring(lastIndex, h.start)}</span>);
      const safeEnd = Math.min(h.end, text.length);
      parts.push(<mark key={`m-${idx}`} className="bg-yellow-200/60 dark:bg-yellow-600/30 rounded px-0.5 cursor-pointer hover:bg-red-200 transition-colors" onClick={(e) => { e.stopPropagation(); setHighlights(prev => prev.filter((_, i) => i !== idx)); }}>{text.substring(h.start, safeEnd)}</mark>);
      lastIndex = safeEnd;
    });
    if (lastIndex < text.length) parts.push(<span key="t-end">{text.substring(lastIndex)}</span>);
    return parts;
  }, [question, highlights]);

  // --- STYLES GENERATOR ---
  const getOptionStyles = (key: string) => {
    const isSelected = selectedOption === key;
    const isEliminated = eliminatedOptions.includes(key);
    const isCorrectKey = correctKeys.includes(key); 
    
    let container = "group relative flex items-start md:items-center gap-4 p-5 md:p-6 rounded-[1.25rem] border-2 transition-all duration-200 cursor-pointer text-base select-none font-sans overflow-hidden touch-pan-y ";
    let circle = "mt-0.5 md:mt-0 flex items-center justify-center w-7 h-7 rounded-full border-[2px] flex-shrink-0 text-xs font-black transition-all duration-200 ";
    let textStyle = "leading-relaxed flex-1 font-medium transition-colors duration-200 ";

    if (isSubmitted) {
        if (isAnulada) {
            container += isSelected ? "bg-blue-50 border-blue-300 dark:bg-blue-900/20 " : "opacity-70 bg-white border-zinc-100 dark:bg-zinc-900 ";
            circle += "border-zinc-300 text-zinc-400 ";
            textStyle += "text-zinc-500 ";
        } else if (isCorrectKey) {
            container += "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-500 ";
            circle += "bg-emerald-600 border-emerald-600 text-white ";
            textStyle += "text-emerald-900 dark:text-emerald-100 font-bold ";
        } else if (isSelected && !isCorrectKey) {
            container += "bg-rose-50 dark:bg-rose-950/20 border-rose-500 ";
            circle += "bg-rose-500 border-rose-500 text-white ";
            textStyle += "text-rose-900 dark:text-rose-100 ";
        } else {
            container += "opacity-60 bg-white dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800 ";
            circle += "border-zinc-200 dark:border-zinc-700 ";
            textStyle += "text-zinc-400 ";
        }
    } else {
        if (isEliminated) {
            container += "opacity-50 grayscale bg-zinc-50 dark:bg-zinc-950 border-zinc-100 dark:border-zinc-800/50 ";
            circle += "border-zinc-200 dark:border-zinc-800 text-zinc-300 ";
            textStyle += "line-through text-zinc-400 decoration-zinc-400/50 ";
        } else if (isSelected) {
            container += "bg-white dark:bg-zinc-800 border-indigo-600 dark:border-indigo-500 ring-4 ring-indigo-50 dark:ring-indigo-900/10 z-10 shadow-lg ";
            circle += "bg-indigo-600 border-indigo-600 text-white ";
            textStyle += "text-indigo-900 dark:text-indigo-100 font-semibold ";
        } else {
            container += "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:border-indigo-300 dark:hover:border-zinc-600 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 ";
            circle += "border-zinc-300 dark:border-zinc-600 text-zinc-400 group-hover:border-indigo-400 group-hover:text-indigo-500 ";
            textStyle += "text-zinc-600 dark:text-zinc-300 group-hover:text-zinc-900 dark:group-hover:text-white ";
        }
    }
    return { container, circle, text: textStyle };
  };

  return (
    <>
      {showPremiumModal && (
        <PremiumLockModal 
          onNavigate={onNavigate} 
          planType={userPlanType}
          questionsUsed={userQuestionsAnswered}
          questionsLimit={userQuestionsLimit}
        />
      )}
      {showTutorial && <TutorialInfoModal onClose={closeTutorial} />}
      
      <div className="h-full w-full overflow-y-auto bg-[#FDFDFD] dark:bg-[#09090b] custom-scrollbar animate-in fade-in duration-500 flex flex-col items-center font-sans selection:bg-indigo-100 dark:selection:bg-indigo-900/40" onContextMenu={(e) => e.preventDefault()}>
          
         <div className="w-full max-w-[900px] p-6 md:py-12 space-y-8 pb-40 md:pb-[500px]">
            
            {/* --- HEADER --- */}
            <div className="flex flex-col gap-4 w-full">
                <div className="flex justify-between items-center">
                      <span className="font-mono text-xs font-bold text-zinc-400 bg-zinc-100 dark:bg-zinc-900 px-3 py-1.5 rounded-lg tracking-wider">
                         {String(currentIndex + 1).padStart(2, '0')} <span className="text-zinc-300 dark:text-zinc-700">/</span> {totalQuestions}
                      </span>
                      
                      <div className="flex items-center gap-1 bg-white dark:bg-zinc-900 p-1 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm">
                         {highlights.length > 0 && (
                             <button onClick={() => setHighlights([])} className="p-2 text-zinc-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all" title="Limpar grifos"><Eraser size={18}/></button>
                         )}
                         <button onClick={() => setShowNotes(!showNotes)} className={`p-2 rounded-xl transition-all ${showNotes || userNote ? 'text-amber-600 bg-amber-50 dark:bg-amber-900/20' : 'text-zinc-400 hover:text-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800'}`} title="Anotações"><StickyNote size={18}/></button>
                         <button onClick={() => setShowReportModal(true)} className="p-2 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-xl transition-all" title="Reportar"><Flag size={18}/></button>
                      </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-xs md:text-sm font-medium text-zinc-500 dark:text-zinc-400 pt-2 border-b border-zinc-100 dark:border-zinc-800 pb-4">
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-100 dark:bg-zinc-900 rounded-full">
                        <GraduationCap size={14} className="text-zinc-400"/>
                        <span className="text-zinc-900 dark:text-zinc-200 font-bold">{question.origem}</span>
                    </div>
                    <div className="w-1 h-1 bg-zinc-300 dark:bg-zinc-700 rounded-full"></div>
                    <span className="font-semibold">{question.ano}</span>
                    <div className="w-1 h-1 bg-zinc-300 dark:bg-zinc-700 rounded-full"></div>
                    <div className="flex items-center gap-1.5">
                        <BookOpen size={14} className="text-zinc-400"/>
                        <span className="uppercase tracking-wide text-[11px]">{categoryDisplay}</span>
                    </div>
                </div>
            </div>

            {/* ENUNCIADO */}
            <div className="relative group outline-none" onTouchEnd={(e) => {
                 const now = Date.now();
                 if (now - lastTap.current < 300 && now - lastTap.current > 0) setTimeout(handleTextMouseUp, 50);
                 lastTap.current = now;
            }}>
               <div ref={enunciadoRef} onMouseUp={handleTextMouseUp} className="text-lg md:text-[1.25rem] leading-[1.8] text-zinc-800 dark:text-zinc-200 font-medium cursor-text font-sans tracking-tight">
                   {renderedEnunciado}
               </div>

               {/* ✨ NOVO: Imagem da Questão via Cloudinary ✨ */}
              <img
  // A URL inicial começa sempre pelo .jpg (formato 0 da nossa lista)
  src={`https://res.cloudinary.com/dfly2thac/image/upload/apex-med/${question.id}.jpg`}
  alt={`Ilustração da questão ${question.id}`}
  className="mt-6 max-w-full rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm"
  data-attempt="0" // Contador escondido para sabermos em qual tentativa estamos
  onError={(e) => {
    const target = e.currentTarget;
    // Lista de todos os formatos que o Apex Med vai aceitar
    const formats = ['.jpg', '.png', '.jpeg', '.webp']; 
    
    // Lê em qual tentativa estamos
    let attempt = parseInt(target.getAttribute('data-attempt') || '0', 10);

    // Se ainda não tentámos todos os formatos da lista...
    if (attempt < formats.length - 1) {
      const currentExt = formats[attempt];
      const nextExt = formats[attempt + 1];
      
      // Substitui a extensão na URL pela próxima da lista
      target.src = target.src.replace(currentExt, nextExt);
      
      // Atualiza o contador para a próxima tentativa
      target.setAttribute('data-attempt', String(attempt + 1));
    } else {
      // Se já testou a lista inteira e deu erro em todas, a imagem não existe. Pode esconder.
      target.style.display = 'none';
    }
  }}
/>

              
              
            </div>

            {/* NOTAS */}
            {showNotes && (
               <div className="bg-amber-50 dark:bg-yellow-950/10 border border-amber-100 dark:border-yellow-900/20 p-5 rounded-2xl animate-in slide-in-from-top-2">
                  <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 text-amber-700 dark:text-amber-500 font-bold text-xs uppercase tracking-wider">
                          <NotebookPen size={14}/> Bloco de Notas
                      </div>
                      {isNoteSaved && <span className="text-emerald-600 text-[10px] font-bold bg-emerald-100 px-2 rounded-full">Salvo</span>}
                  </div>
                  <textarea value={userNote} onChange={e => setUserNote(e.target.value)} onBlur={handleSaveNote} className="w-full bg-transparent border-none focus:ring-0 text-zinc-800 dark:text-zinc-300 resize-none h-24 leading-relaxed text-sm placeholder:text-amber-800/30" placeholder="Suas anotações pessoais..."/>
               </div>
            )}

            {/* OPÇÕES */}
            <div className="flex flex-col gap-3 mt-6">
               {optionsList.map((opt) => {
                   const styles = getOptionStyles(opt.key);
                   const isEliminated = eliminatedOptions.includes(opt.key);
                   const isSelected = selectedOption === opt.key;

                   return (
                     <div key={opt.key} 
                          onClick={() => !isEliminated && handleOptionSelect(opt.key)} 
                          onTouchStart={handleTouchStart}
                          onTouchMove={handleTouchMove}
                          onTouchEnd={() => handleTouchEnd(opt.key)}
                          className={styles.container}>
                        
                        <div className={styles.circle}>
                            {isEliminated ? <EyeOff size={14}/> : 
                             isSubmitted && correctKeys.includes(opt.key) ? <CheckCircle2 size={16}/> : 
                             isSubmitted && isSelected ? <XCircle size={16}/> : 
                             opt.key}
                        </div>
                        <div className={styles.text}>{opt.text}</div>

                        {!isSubmitted && (
                            <button
                                onClick={(e) => { e.stopPropagation(); toggleElimination(opt.key); }}
                                className={`
                                    absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full transition-all duration-300 z-20 border
                                    ${isEliminated
                                        ? "opacity-100 bg-white border-zinc-200 text-zinc-400 hover:text-zinc-600 dark:bg-zinc-900 dark:border-zinc-700 dark:text-zinc-500"
                                        : "bg-white dark:bg-zinc-800 border-zinc-100 dark:border-zinc-700 text-zinc-300 hover:text-rose-500 hover:border-rose-200 dark:hover:border-rose-900 hover:bg-rose-50 dark:hover:bg-rose-900/20"
                                    }
                                    ${!isEliminated && isSelected 
                                        ? "opacity-100 translate-x-0"
                                        : !isEliminated ? "opacity-0 translate-x-4 md:group-hover:opacity-100 md:group-hover:translate-x-0" : ""
                                    }
                                `}
                                title={isEliminated ? "Restaurar" : "Ocultar"}
                            >
                                {isEliminated ? <Eye size={18}/> : <EyeOff size={18}/>}
                            </button>
                        )}
                      </div>
                    );
               })}
            </div>

            {/* --- FEEDBACK CLEAN + ACORDEÕES --- */}
            {isSubmitted && (
               <div className="mt-8 rounded-[2rem] bg-zinc-50/50 dark:bg-zinc-900/30 border border-zinc-200 dark:border-zinc-800 animate-in slide-in-from-bottom-4 overflow-hidden">
                  <div className={`px-6 py-4 border-b flex items-center gap-3 ${isAnulada ? 'bg-blue-50/50 border-blue-100' : 'border-zinc-100 dark:border-zinc-800'}`}>
                      <div className={`p-1.5 rounded-lg ${isAnulada ? 'bg-blue-100 text-blue-600' : isUserCorrect ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400'}`}>
                          {isAnulada ? <Info size={18}/> : <Sparkles size={18}/>}
                      </div>
                      
                      <h3 className="font-bold text-base text-zinc-900 dark:text-white">
                         {isAnulada ? 'Questão Anulada' : 
                          isUserCorrect ? 'Você acertou! Confira o comentário:' : 
                          'Resposta Incorreta. Veja a justificativa:'}
                      </h3>
                  </div>

                  <div className="p-6 md:p-8 space-y-6">
                      <div className="prose prose-sm md:prose-base prose-zinc dark:prose-invert max-w-none">
                          
                          {/* 1. COMENTÁRIO GERAL */}
                          <div className="mb-8">
                              <p className="whitespace-pre-wrap leading-loose text-zinc-600 dark:text-zinc-300">
                                 {question.comentario || "Sem comentário disponível."}
                              </p>
                          </div>

                          {/* 2. ACORDEÕES PARA AS INCORRETAS */}
                          {!isAnulada && (
                            <div className="space-y-3">
                                {optionsList.map(opt => {
                                    if (correctKeys.includes(opt.key)) return null;

                                    const justificationText = (question as any)[`justificativa_${opt.key.toLowerCase()}`];

                                    if (!justificationText || typeof justificationText !== 'string' || justificationText.trim() === '') return null;

                                    return (
                                        <JustificationAccordion 
                                            key={opt.key} 
                                            letter={opt.key} 
                                            text={justificationText} 
                                        />
                                    );
                                })}
                            </div>
                          )}

                      </div>
                  </div>
               </div>
            )}

            {/* ACTIONS BAR */}
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl p-2 rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-zinc-100 dark:border-zinc-800 z-40 scale-95 md:scale-100">
               {onBack && (
                 <button onClick={onBack} className="w-11 h-11 flex items-center justify-center rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-700 transition-colors" title="Anterior"><ChevronLeft size={20}/></button>
               )}
               
               {!isSubmitted ? (
                  <button 
                    onClick={handleSubmit} 
                    disabled={!selectedOption || isSubmitting} 
                    className="bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 px-10 py-3 rounded-full font-bold text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] transition-all shadow-xl flex items-center gap-2"
                  >
                      {isSubmitting ? 'Salvando...' : 'Responder'}
                  </button>
               ) : (
                  onNext && !isLastQuestion ? (
                      <button onClick={onNext} className="bg-indigo-600 text-white px-10 py-3 rounded-full font-bold text-sm hover:bg-indigo-700 transition-all flex items-center gap-2 shadow-lg shadow-indigo-500/20">
                         Próxima <ChevronRight size={18}/>
                      </button>
                   ) : (
                      <button onClick={onFinish} className="bg-rose-600 text-white px-10 py-3 rounded-full font-bold text-sm hover:bg-rose-700 transition-all shadow-lg shadow-rose-500/20 flex items-center gap-2">
                         Finalizar <AlertCircle size={18}/>
                      </button>
                   )
               )}
            </div>

         </div>
      </div>
      
      {/* --- MODAL REPORT (Clean) --- */}
      {showReportModal && (
        <div className="fixed inset-0 z-[160] flex items-center justify-center p-4 bg-zinc-50/90 dark:bg-black/90 backdrop-blur-sm animate-in fade-in duration-200">
           <div className="bg-white dark:bg-zinc-900 p-6 md:p-8 rounded-[2rem] w-full max-w-md border border-zinc-100 dark:border-zinc-800 shadow-2xl animate-in zoom-in-95 duration-200">
              <div className="flex justify-between items-center mb-6">
                  <h3 className="font-bold text-xl text-zinc-900 dark:text-white flex items-center gap-2">
                      <Flag size={20} className="text-indigo-600"/> Reportar Erro
                  </h3>
                  <button onClick={() => setShowReportModal(false)} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors"><X size={20} className="text-zinc-400"/></button>
              </div>
              <div className="space-y-4">
                  <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Tipo de Erro</label>
                      <select value={reportCategory} onChange={e => setReportCategory(e.target.value)} className="w-full p-3 bg-zinc-50 dark:bg-zinc-800 border-none rounded-xl text-sm font-medium text-zinc-700 dark:text-zinc-200 focus:ring-2 focus:ring-indigo-500 outline-none">
                          <option value="erro-gabarito">Gabarito Incorreto</option>
                          <option value="erro-enunciado">Erro no Enunciado</option>
                          <option value="erro-comentario">Comentário Insuficiente</option>
                      </select>
                  </div>
                  <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Descrição</label>
                      <textarea className="w-full bg-zinc-50 dark:bg-zinc-800 border-none p-4 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none h-32 placeholder:text-zinc-400" placeholder="O que está errado?" value={reportReason} onChange={e => setReportReason(e.target.value)}/>
                  </div>
                  <div className="flex gap-3 pt-4">
                      <button onClick={() => setShowReportModal(false)} className="flex-1 py-3 bg-zinc-100 dark:bg-zinc-800 rounded-xl font-bold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 transition-colors text-sm">Cancelar</button>
                      <button onClick={handleReportSubmit} className="flex-1 py-3 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-xl font-bold hover:opacity-90 shadow-lg transition-all active:scale-95 text-sm">{isReporting ? '...' : 'Enviar Report'}</button>
                  </div>
              </div>
           </div>
        </div>
      )}
    </>
  );
};

export default QuestionCard;
