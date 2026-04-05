// Caminho: src/FilterScreen.tsx

import React, { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import {
  BookOpen, Calendar, Building2, Play, BookMarked, X,
  Settings2, CheckCircle2, Search, EyeOff,
  Trash2, Layers, ArrowRight, Filter, Plus, RefreshCw,
  Loader2, Stethoscope, Brain, ChevronDown, ChevronLeft, ChevronRight, Zap, Info,
  History, Save, Copy, Clipboard, Repeat, PenLine
} from 'lucide-react';

// Importando tipos do arquivo unificado
import { FilterState, Question, UserHistoryItem } from './App';

// ============================================================================
// SERVIÇOS LOCAIS DE SESSÃO (Substituindo o Supabase para Simulados Salvos)
// ============================================================================
export interface QuizSession {
  id: string;
  created_at: number;
  filters: FilterState;
  total_questions: number;
  score?: number;
  title?: string;
  is_saved: boolean;
  question_ids: number[];
}

const SESSIONS_KEY = 'app_lite_sessions';

const getQuizSessions = (): QuizSession[] => {
  try { return JSON.parse(localStorage.getItem(SESSIONS_KEY) || '[]'); } catch { return []; }
};

const saveQuizSessionLocal = (session: QuizSession): void => {
  try {
    const sessions = getQuizSessions();
    const index = sessions.findIndex(s => s.id === session.id);
    if (index >= 0) sessions[index] = session;
    else sessions.push(session);
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
  } catch (e) { console.error(e); }
};

const deleteQuizSessionLocal = (sessionId: string): void => {
  try {
    const sessions = getQuizSessions();
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions.filter(s => s.id !== sessionId)));
  } catch (e) { console.error(e); }
};

// ─────────────────────────────────────────────
// MAPEAMENTOS
// ─────────────────────────────────────────────
const GRANDES_AREAS_MAP: Record<string, string> = {
  'CB': 'Ciclo Básico', 'CC': 'Clínica Cirúrgica', 'CM': 'Clínica Médica',
  'GO': 'Ginecologia e Obstetrícia', 'PED': 'Pediatria', 'SC': 'Saúde Coletiva',
  'PREV': 'Medicina Preventiva', 'SM': 'Saúde Mental',
};

const CATEGORY_NAMES_INTERNAL = GRANDES_AREAS_MAP;

const COMPETENCIA_PRIORITY = ['Epidemiologia', 'Fisiopatologia', 'Diagnóstico', 'Conduta'];

const COMPETENCIA_PRIORITY_MAP = new Map<string, number>(
  COMPETENCIA_PRIORITY.map((v, i) => [v, i])
);

interface KnowledgeNode {
  categoria: string; especialidade: string; tema: string; competencia: string;
  total: number; correct: number; accuracy: number; recency: number; urgency: number;
}

// ─────────────────────────────────────────────
// BANNER CARROSSEL
// ─────────────────────────────────────────────
const BANNER_IMAGES = ['banner_promo_01.webp', 'banner_promo_02.webp', 'banner_promo_03.webp'];
const BANNER_AUTOPLAY_INTERVAL_MS = 5000;

const PromoBannerCarousel = React.memo(() => {
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const autoplayTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const resetAutoplay = useCallback(() => {
    if (autoplayTimerRef.current) clearInterval(autoplayTimerRef.current);
    autoplayTimerRef.current = setInterval(
      () => setCurrentSlideIndex(prev => (prev + 1) % BANNER_IMAGES.length),
      BANNER_AUTOPLAY_INTERVAL_MS
    );
  }, []);

  useEffect(() => {
    resetAutoplay();
    return () => { if (autoplayTimerRef.current) clearInterval(autoplayTimerRef.current); };
  }, [resetAutoplay]);

  const goToSlide = useCallback((targetIndex: number) => {
    setCurrentSlideIndex(targetIndex);
    resetAutoplay();
  }, [resetAutoplay]);

  const goPrev = useCallback(() =>
    goToSlide((currentSlideIndex - 1 + BANNER_IMAGES.length) % BANNER_IMAGES.length),
    [currentSlideIndex, goToSlide]
  );

  const goNext = useCallback(() =>
    goToSlide((currentSlideIndex + 1) % BANNER_IMAGES.length),
    [currentSlideIndex, goToSlide]
  );

  return (
    <div className="relative w-full rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800/60" style={{ aspectRatio: '16/5' }}>
      <div className="flex h-full transition-transform duration-500 ease-out" style={{ transform: `translateX(-${currentSlideIndex * 100}%)` }}>
        {BANNER_IMAGES.map((imageName, index) => (
          <div key={index} className="min-w-full h-full flex items-center justify-center">
            <img src={`/banners/${imageName}`} alt={`Promoção ${index + 1}`} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          </div>
        ))}
      </div>
      <button onClick={goPrev} className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white/80 dark:bg-black/50 flex items-center justify-center text-slate-600 dark:text-white hover:bg-white transition-colors"><ChevronLeft size={16} /></button>
      <button onClick={goNext} className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white/80 dark:bg-black/50 flex items-center justify-center text-slate-600 dark:text-white hover:bg-white transition-colors"><ChevronRight size={16} /></button>
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
        {BANNER_IMAGES.map((_, index) => (
          <button key={index} onClick={() => goToSlide(index)} className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${index === currentSlideIndex ? 'bg-[#BD4234] w-4' : 'bg-white/60'}`} />
        ))}
      </div>
    </div>
  );
});

// ─────────────────────────────────────────────
// TIPOS PARA FACETS E COMPONENTES VISUAIS
// ─────────────────────────────────────────────
interface FilterOption {
  value: string;
  label: string;
  count: number;
}

interface FilterSectionProps {
  title: string;
  icon: React.ElementType;
  items: FilterOption[];
  selectedItems: string[];
  onToggle: (val: string) => void;
  isOpen: boolean;
  onToggleOpen: () => void;
  enableSearch?: boolean;
}

const FilterSection = React.memo(
  ({
    title,
    icon: Icon,
    items,
    selectedItems,
    onToggle,
    isOpen,
    onToggleOpen,
    enableSearch,
  }: FilterSectionProps) => {
    const [searchTerm, setSearchTerm] = useState("");

    const visibleItems = useMemo(() => {
      if (!enableSearch || !searchTerm) return items;
      const s = searchTerm.toLowerCase();
      return items.filter((opt) => opt.label.toLowerCase().includes(s));
    }, [items, searchTerm, enableSearch]);

    const selectedSet = useMemo(() => new Set(selectedItems), [selectedItems]);

    return (
      <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
        <button
          onClick={onToggleOpen}
          className="w-full flex items-center justify-between p-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Icon size={16} className="text-slate-400" />
            <span className="font-medium text-sm text-slate-700 dark:text-slate-300">
              {title}
            </span>
            {selectedItems.length > 0 && (
              <span className="text-xs bg-[#BD4234] text-white px-1.5 py-0.5 rounded-full font-semibold">
                {selectedItems.length}
              </span>
            )}
          </div>
          <ChevronDown
            size={16}
            className={`text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
          />
        </button>

        {isOpen && (
          <div className="px-3 pb-3 space-y-2 border-t border-slate-100 dark:border-slate-800 pt-2">
            {enableSearch && (
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={`Buscar ${title.toLowerCase()}...`}
                className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-[#BD4234] transition-colors"
              />
            )}

            <div className="max-h-48 overflow-y-auto space-y-1">
              {visibleItems.map((opt) => {
                const isSelected = selectedSet.has(opt.value);

                return (
                  <label
                    key={opt.value}
                    className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors ${
                      isSelected ? "bg-red-50 dark:bg-red-900/10" : "hover:bg-slate-50 dark:hover:bg-slate-800/50"
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${
                        isSelected ? "border-[#BD4234] bg-[#BD4234]" : "border-slate-300 dark:border-slate-600"
                      }`}
                    >
                      {isSelected && <CheckCircle2 size={10} className="text-white" />}
                    </div>

                    <div className="min-w-0 flex-1 flex items-center justify-between gap-2">
                      <span className="text-xs text-slate-600 dark:text-slate-300 truncate">
                        {opt.label}
                      </span>
                      <span className="text-[10px] font-semibold text-slate-400 shrink-0">
                        {opt.count}
                      </span>
                    </div>

                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => onToggle(opt.value)}
                      className="hidden"
                    />
                  </label>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }
);

interface FilterChipGroupProps {
  title: string;
  icon: React.ElementType;
  items: FilterOption[];
  selectedItems: string[];
  onToggle: (val: string) => void;
}

const FilterChipGroup = React.memo(({ title, icon: Icon, items, selectedItems, onToggle }: FilterChipGroupProps) => {
  const selectedSet = useMemo(() => new Set(selectedItems), [selectedItems]);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
      <div className="flex items-center gap-2 mb-3">
        <Icon size={16} className="text-slate-400" />
        <span className="font-medium text-sm text-slate-700 dark:text-slate-300">{title}</span>
        {selectedItems.length > 0 && <span className="text-xs bg-[#BD4234] text-white px-1.5 py-0.5 rounded-full font-semibold">{selectedItems.length}</span>}
      </div>
      <div className="flex flex-wrap gap-2">
        {items.length === 0 ? (
          <span className="text-xs text-slate-400 italic">Nenhuma opção disponível.</span>
        ) : (
          items.map((opt) => {
            const isSelected = selectedSet.has(opt.value);
            return (
              <button
                key={opt.value}
                onClick={() => onToggle(opt.value)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-200 border ${
                  isSelected
                    ? 'bg-red-50 dark:bg-red-900/20 border-[#BD4234] text-[#BD4234] shadow-sm'
                    : 'bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                {isSelected && <CheckCircle2 size={12} className="text-[#BD4234]" />}
                {opt.label}
                <span className={`ml-1 text-[10px] px-1.5 py-0.5 rounded-md ${isSelected ? 'bg-[#BD4234]/10 text-[#BD4234]' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                  {opt.count}
                </span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
});

interface SelectDropdownProps {
  label: string;
  items: FilterOption[];
  selectedItems: string[];
  onToggle: (val: string) => void;
  placeholder?: string;
  enableSearch?: boolean;
}

const SelectDropdown = React.memo(
  ({ label, items, selectedItems, onToggle, placeholder, enableSearch }: SelectDropdownProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");

    const visibleItems = useMemo(() => {
      if (!enableSearch || !searchTerm) return items;
      const s = searchTerm.toLowerCase();
      return items.filter((opt) => opt.label.toLowerCase().includes(s));
    }, [items, searchTerm, enableSearch]);

    const selectedSet = useMemo(() => new Set(selectedItems), [selectedItems]);

    return (
      <div className="relative">
        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
          {label}
        </label>

        <button
          onClick={() => setIsOpen((v) => !v)}
          className="w-full flex items-center justify-between px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white hover:border-[#BD4234] transition-colors"
        >
          <span className="truncate">
            {selectedItems.length > 0 ? `${selectedItems.length} selecionado(s)` : placeholder}
          </span>
          <ChevronDown size={14} className={`transition-transform ${isOpen ? "rotate-180" : ""}`} />
        </button>

        {isOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
            <div className="absolute z-20 mt-1 w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl max-h-64 overflow-hidden">
              {enableSearch && (
                <div className="p-2 border-b border-slate-100 dark:border-slate-800">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Buscar..."
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none"
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              )}

              <div className="max-h-52 overflow-y-auto p-1">
                {visibleItems.map((opt) => {
                  const isSelected = selectedSet.has(opt.value);

                  return (
                    <label
                      key={opt.value}
                      className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors ${
                        isSelected ? "bg-red-50 dark:bg-red-900/10" : "hover:bg-slate-50 dark:hover:bg-slate-800/50"
                      }`}
                    >
                      <div
                        className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${
                          isSelected ? "border-[#BD4234] bg-[#BD4234]" : "border-slate-300 dark:border-slate-600"
                        }`}
                      >
                        {isSelected && <CheckCircle2 size={10} className="text-white" />}
                      </div>

                      <div className="min-w-0 flex-1 flex items-center justify-between gap-2">
                        <span className="text-xs text-slate-600 dark:text-slate-300 truncate">
                          {opt.label}
                        </span>
                        <span className="text-[10px] font-semibold text-slate-400 shrink-0">
                          {opt.count}
                        </span>
                      </div>

                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => onToggle(opt.value)}
                        className="hidden"
                      />
                    </label>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
    );
  }
);

interface ToggleChipProps {
  label: string; icon: React.ElementType; isActive: boolean; onClick: () => void; colorClass?: string;
}

const ToggleChip = React.memo(({ label, icon: Icon, isActive, onClick, colorClass = 'bg-[#BD4234]' }: ToggleChipProps) => (
  <button
    onClick={onClick}
    className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 ${
      isActive
        ? `${colorClass} text-white shadow-md scale-[1.02]`
        : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'
    }`}
  >
    <Icon size={16} />
    <span>{label}</span>
  </button>
));

// ─────────────────────────────────────────────
// HELPERS — Facets (Filtro avançado com opções dinâmicas)
// ─────────────────────────────────────────────

type FacetKey =
  | "categorias"
  | "origens"
  | "anos"
  | "especialidades"
  | "temas_especificos"
  | "competencias";

function normalizeValue(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s.length ? s : null;
}

function getFacetValue(q: Question, key: FacetKey): string | null {
  switch (key) {
    case "categorias":      return normalizeValue(q.categoria);
    case "origens":         return normalizeValue(q.origem);
    case "anos":            return normalizeValue(q.ano);
    case "temas_especificos": return normalizeValue(q.tema_especifico);
    case "especialidades":  return normalizeValue((q as any).especialidade);
    case "competencias":    return normalizeValue((q as any).competencias ?? null);
    default:                return null;
  }
}

type ApplyFilterContext = {
  excludeKey?: FacetKey;
  answeredQuestionIds?: Set<number>;
  correctlyAnsweredIds?: Set<number>;
};

function applyAllFilters(
  questionList: Question[],
  currentFilters: FilterState,
  ctx: ApplyFilterContext = {}
): Question[] {
  const categorias    = (currentFilters.categorias || []) as string[];
  const temas         = (currentFilters.temas_especificos || []) as string[];
  const anos          = (currentFilters.anos || []) as string[];
  const origens       = (currentFilters.origens || []) as string[];
  const especialidades = ((currentFilters as any).especialidades || []) as string[];
  const competencias  = ((currentFilters as any).competencias || []) as string[];
  const searchQueries = (currentFilters.searchQueries || []) as string[];

  const categoriasSet    = categorias.length    ? new Set(categorias)    : null;
  const temasSet         = temas.length         ? new Set(temas)         : null;
  const anosSet          = anos.length          ? new Set(anos)          : null;
  const origensSet       = origens.length       ? new Set(origens)       : null;
  const especialidadesSet = especialidades.length ? new Set(especialidades) : null;

  const competenciasNorm = competencias.length
    ? new Set(competencias.map((c) => c.trim().toLowerCase()))
    : null;

  const searchTerms = searchQueries.length
    ? searchQueries.map((t) => t.toLowerCase())
    : null;

  const { excludeKey, answeredQuestionIds, correctlyAnsweredIds } = ctx;

  return questionList.filter((q) => {
    if (excludeKey !== "categorias" && categoriasSet) {
      const v = getFacetValue(q, "categorias");
      if (!v || !categoriasSet.has(v)) return false;
    }
    if (excludeKey !== "origens" && origensSet) {
      const v = getFacetValue(q, "origens");
      if (!v || !origensSet.has(v)) return false;
    }
    if (excludeKey !== "anos" && anosSet) {
      const v = getFacetValue(q, "anos");
      if (!v || !anosSet.has(v)) return false;
    }
    if (excludeKey !== "especialidades" && especialidadesSet) {
      const v = getFacetValue(q, "especialidades");
      if (!v || !especialidadesSet.has(v)) return false;
    }
    if (excludeKey !== "temas_especificos" && temasSet) {
      const v = getFacetValue(q, "temas_especificos");
      if (!v || !temasSet.has(v)) return false;
    }
    if (excludeKey !== "competencias" && competenciasNorm) {
      const v = getFacetValue(q, "competencias");
      if (!v || !competenciasNorm.has(v.trim().toLowerCase())) return false;
    }
    if (searchTerms) {
      const enunciado = (q.enunciado || "").toLowerCase();
      const tema = (q.tema_especifico || "").toLowerCase();
      if (!searchTerms.some((t) => enunciado.includes(t) || tema.includes(t))) return false;
    }
    if (answeredQuestionIds && currentFilters.excludeSeen) {
      if (answeredQuestionIds.has(q.id)) return false;
    } else if (correctlyAnsweredIds && currentFilters.excludeCorrect) {
      if (correctlyAnsweredIds.has(q.id)) return false;
    }

    return true;
  });
}

type FacetBuildContext = ApplyFilterContext & {
  labelMaps?: Partial<Record<FacetKey, Record<string, string>>>;
};

function buildFacetOptions(
  questionList: Question[],
  currentFilters: FilterState,
  ctx: FacetBuildContext = {}
) {
  const keys: FacetKey[] = [
    "categorias", "especialidades", "temas_especificos",
    "competencias", "origens", "anos",
  ];

  const labelMaps = ctx.labelMaps || {};
  const getLabel = (key: FacetKey, value: string) => labelMaps[key]?.[value] || value;

  const facets: Record<FacetKey, FilterOption[]> = {
    categorias: [], origens: [], anos: [],
    especialidades: [], temas_especificos: [], competencias: [],
  };

  for (const key of keys) {
    const base = applyAllFilters(questionList, currentFilters, {
      excludeKey: key,
      answeredQuestionIds: ctx.answeredQuestionIds,
      correctlyAnsweredIds: ctx.correctlyAnsweredIds,
    });

    const countMap = new Map<string, number>();
    const rawLabelMap = new Map<string, string>();

    for (const q of base) {
      const v = getFacetValue(q, key);
      if (!v) continue;
      const mapKey = key === "competencias" ? v.trim().toLowerCase() : v;
      countMap.set(mapKey, (countMap.get(mapKey) || 0) + 1);
      if (key === "competencias" && !rawLabelMap.has(mapKey)) {
        rawLabelMap.set(mapKey, v);
      }
    }

    const selected = (((currentFilters as any)[key] || []) as string[]);
    const universe = new Set<string>(countMap.keys());

    for (const v of selected) {
      universe.add(key === "competencias" ? v.trim().toLowerCase() : v);
    }

    let options: FilterOption[] = Array.from(universe).map((universeKey) => {
      if (key === "competencias") {
        const originalLabel = rawLabelMap.get(universeKey) || universeKey;
        return { value: originalLabel, label: originalLabel, count: countMap.get(universeKey) || 0 };
      }
      return { value: universeKey, label: getLabel(key, universeKey), count: countMap.get(universeKey) || 0 };
    });

    if (key === "anos") {
      options.sort((a, b) => (parseInt(b.value, 10) || 0) - (parseInt(a.value, 10) || 0));
    } else if (key === "competencias") {
      options.sort((a, b) => {
        const aOrder = COMPETENCIA_PRIORITY_MAP.has(a.value) ? COMPETENCIA_PRIORITY_MAP.get(a.value)! : 999;
        const bOrder = COMPETENCIA_PRIORITY_MAP.has(b.value) ? COMPETENCIA_PRIORITY_MAP.get(b.value)! : 999;
        return aOrder !== bOrder ? aOrder - bOrder : a.label.localeCompare(b.label, "pt-BR");
      });
    } else {
      options.sort((a, b) => a.label.localeCompare(b.label, "pt-BR"));
    }

    facets[key] = options;
  }

  return facets;
}

function hasAnyActiveFilter(currentFilters: FilterState): boolean {
  if (!currentFilters) return false;
  if (currentFilters.excludeCorrect || currentFilters.excludeSeen) return true;
  if ((currentFilters as any).onlyWrong) return true;

  const arrayKeys = [
    'categorias', 'temas_especificos', 'anos', 'origens',
    'searchQueries', 'especialidades', 'competencias',
  ] as const;

  for (const k of arrayKeys) {
    if (((currentFilters as any)[k] || []).length > 0) return true;
  }
  return false;
}

// ─────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────

interface FilterScreenProps {
  questions: Partial<Question>[];
  history?: UserHistoryItem[];
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  onStartQuiz: (limit: number, randomize: boolean, smartSelection: boolean, smartSortedIds?: number[]) => void;
  filteredCount?: number;
}

const FilterScreen: React.FC<FilterScreenProps> = ({
  questions = [],
  history: historyProp = [],
  filters,
  setFilters,
  onStartQuiz
}) => {
  // Simulando dados de usuário para a versão local
  const firstName = 'Doutor(a)';

  // -- ESTADOS DA UI --
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showTutorial, setShowTutorial] = useState(() => !localStorage.getItem('filterTutorialSeen'));
  const [showUpdateWarning, setShowUpdateWarning] = useState(false);
  const [questionLimit, setQuestionLimit] = useState(10);
  const [isSmartSelectionEnabled, setIsSmartSelectionEnabled] = useState(false);
  const [keywordSearchText, setKeywordSearchText] = useState('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  const [expandedSectionsSet, setExpandedSectionsSet] = useState<Set<string>>(() => new Set());

  // -- SISTEMA DINÂMICO DE BOAS-VINDAS --
  const [headerText, setHeaderText] = useState({ title: `Olá, {name}`, subtitle: "O que vai estudar hoje?" });

  useEffect(() => {
    const now = Date.now();
    const hour = new Date().getHours();

    const lastVisitTime = parseInt(localStorage.getItem('qb_last_visit_time') || '0', 10);
    const lastVisitDate = localStorage.getItem('qb_last_visit_date');
    let visitsToday = parseInt(localStorage.getItem('qb_daily_visits') || '0', 10);
    const todayStr = new Date().toLocaleDateString('pt-BR');

    if (lastVisitDate !== todayStr) {
      visitsToday = 1;
      localStorage.setItem('qb_last_visit_date', todayStr);
    } else if (now - lastVisitTime > 1000 * 60 * 60) {
      visitsToday += 1;
    }

    localStorage.setItem('qb_daily_visits', visitsToday.toString());
    localStorage.setItem('qb_last_visit_time', now.toString());

    const daysSinceLastVisit = lastVisitTime ? (now - lastVisitTime) / (1000 * 3600 * 24) : 0;

    let pool: { t: string; s: string }[] = [];

    if (daysSinceLastVisit > 3) {
      pool = [
        { t: "Quanto tempo, {name}!", s: "As questões estavam sentindo sua falta." },
        { t: "Olha quem apareceu!", s: "Achamos que tinha esquecido da gente, {name}." },
        { t: "Saudações, {name}!", s: "Vamos tirar a poeira e voltar à ativa?" },
        { t: "Que bom te ver, {name}!", s: "Bora recuperar o tempo perdido!" },
        { t: "O bom filho à casa torna!", s: "Sua cadeira de estudos já estava com saudades, {name}." }
      ];
    } else if (visitsToday > 3) {
      pool = [
        { t: "Você de novo, {name}?", s: "Já vi que alguém quer gabaritar hoje!" },
        { t: "Ainda por aqui, {name}?", s: "A vaga na residência não vem sozinha, né? Bora!" },
        { t: "Dose quádrupla, {name}?", s: "O nosso sistema até assustou com tanta dedicação." },
        { t: "Olha quem voltou!", s: "Descansar é pros fracos, né {name}?" },
        { t: "Mais uma rodada?", s: "A sua cadeira já deve estar com o seu formato, {name}." },
        { t: "Sempre alerta, {name}!", s: "A aprovação vem por insistência e exaustão (das questões)!" },
        { t: "Haja café, hein {name}!", s: "Bora bater mais uma meta antes de fechar o dia." }
      ];
    } else if (hour < 6) {
      pool = [
        { t: "Olá, coruja noturna!", s: "Trocando o sono pela aprovação, {name}?" },
        { t: "Ainda acordado(a), {name}?", s: "A concorrência dorme, você estuda." },
        { t: "Boa madrugada, {name}!", s: "Café ou energético? O que te mantém aqui?" },
        { t: "Shhh... silêncio.", s: "Estudando na calada da noite, hein {name}?" },
        { t: "Insônia, {name}?", s: "Já que não tem sono, que tal umas questõezinhas?" },
        { t: "Firme e forte, {name}!", s: "O R1 do futuro vai agradecer muito por essa madrugada." },
        { t: "Turno da noite, {name}?", s: "O silêncio é o melhor amigo da concentração." }
      ];
    } else if (hour < 12) {
      pool = [
        { t: "Bom dia, {name}!", s: "Já tomou seu café? Bora acordar esses neurônios!" },
        { t: "O sol raiou, {name}!", s: "E a primeira meta do dia é destruir nas questões." },
        { t: "Acorda, {name}!", s: "Cheirinho de café e questões fresquinhas esperando." },
        { t: "Dia lindo, {name}!", s: "Hoje é um ótimo dia para aumentar o seu nível." },
        { t: "Saudações matinais!", s: "Quem cedo madruga, passa mais rápido, {name}." },
        { t: "E aí, {name}?", s: "Pronto(a) para o primeiro round de estudos do dia?" },
        { t: "Bora começar, {name}!", s: "O cérebro tá fresco, hora de aprender assunto novo." }
      ];
    } else if (hour < 18) {
      pool = [
        { t: "Boa tarde, {name}!", s: "Batendo aquele sono pós-almoço? Uma questão acorda!" },
        { t: "E aí, {name}?", s: "Metade do dia já foi. Como estão as metas?" },
        { t: "Tarde boa, {name}!", s: "A digestão fica muito melhor resolvendo uns simulados." },
        { t: "Firme na luta, {name}?", s: "A tarde promete. Vamos buscar essa aprovação!" },
        { t: "Olá, {name}!", s: "Mais um turno de estudos começando. Prepara o foco." },
        { t: "Salve, {name}!", s: "Bora combater a preguiça da tarde quebrando recordes." },
        { t: "Pausa pro café, {name}?", s: "Pega a xícara e vem fazer umas questões." }
      ];
    } else {
      pool = [
        { t: "Boa noite, {name}!", s: "O dia tá acabando, mas a vontade de passar não." },
        { t: "Ainda com energia?", s: "O último gás do dia para bater a meta, {name}!" },
        { t: "Boa noite!", s: "Fechando o dia com chave de ouro nas questões, {name}." },
        { t: "E aí, {name}?", s: "Hora da revisão noturna. Concentração total!" },
        { t: "No plantão, {name}?", s: "Que tal umas questões antes de fechar a conta de hoje?" },
        { t: "Saudações, {name}!", s: "O jantar pode esperar mais umas 10 questõezinhas." },
        { t: "Reta final, {name}!", s: "Último esforço antes de colocar a cabeça no travesseiro." }
      ];
    }

    const selected = pool[Math.floor(Math.random() * pool.length)];
    setHeaderText({ title: selected.t, subtitle: selected.s });
  }, []);

  const renderTextWithName = useCallback((text: string) => {
    const parts = text.split('{name}');
    return (
      <>
        {parts[0]}
        {parts.length > 1 && <span className="text-[#BD4234]">{firstName}</span>}
        {parts[1]}
      </>
    );
  }, [firstName]);

  // -- ESTADOS DO HISTÓRICO E SIMULADOS SALVOS --
  const [recentExamHistory, setRecentExamHistory] = useState<QuizSession[]>([]);
  const [savedSimulations, setSavedSimulations] = useState<QuizSession[]>([]);
  const [copiedFiltersFromSession, setCopiedFiltersFromSession] = useState<FilterState | null>(null);

  // -- ESTADOS DO MODAL DE SALVAR --
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [sessionIdBeingSaved, setSessionIdBeingSaved] = useState<string | null>(null);
  const [saveSimulationName, setSaveSimulationName] = useState('');

  // ─────────────────────────────────────────────
  // CARREGAMENTO DE DADOS (Histórico e Sessões)
  // ─────────────────────────────────────────────
  const [localHistory, setLocalHistory] = useState<UserHistoryItem[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  useEffect(() => {
    if (historyProp && historyProp.length > 0) {
      setLocalHistory(historyProp);
    }
  }, [historyProp]);

  const history = localHistory.length > 0 ? localHistory : historyProp;

  // Carrega sessões do localStorage
  useEffect(() => {
    const allSessions = getQuizSessions();
    setRecentExamHistory(allSessions.filter(s => !s.is_saved).sort((a, b) => b.created_at - a.created_at).slice(0, 30));
    setSavedSimulations(allSessions.filter(s => s.is_saved).sort((a, b) => b.created_at - a.created_at));
  }, []);

  // ─────────────────────────────────────────────
  // LÓGICA DE DIFICULDADE (Smart Selection)
  // ─────────────────────────────────────────────
  const [knowledgeTree, setKnowledgeTree] = useState<Map<string, KnowledgeNode>>(new Map());
  const [isDifficultyDataReady, setIsDifficultyDataReady] = useState(false);
  const [isLoadingDifficulty, setIsLoadingDifficulty] = useState(false);

  useEffect(() => {
    if (!history || history.length === 0) {
      setIsDifficultyDataReady(true);
      setIsLoadingDifficulty(false);
      return;
    }
    const now = Date.now();
    const tree = new Map<string, KnowledgeNode>();
    for (const item of history) {
      const wasCorrect = item.isCorrect ? 1 : 0;
      const answeredAt = item.timestamp || now;
      const rawCategory = item.category || 'Geral';
      const normalizedCategory = CATEGORY_NAMES_INTERNAL[rawCategory] || rawCategory;
      const especialidade = item.especialidade || 'Geral';
      const tema = item.tema_especifico || 'Geral';
      const competencia = item.competencia || 'Geral';
      const nodeKey = `${normalizedCategory}::${especialidade}::${tema}::${competencia}`;
      let node = tree.get(nodeKey);
      if (!node) {
        node = { categoria: normalizedCategory, especialidade, tema, competencia, total: 0, correct: 0, accuracy: 0, recency: answeredAt, urgency: 0 };
        tree.set(nodeKey, node);
      }
      node.total++;
      if (wasCorrect) node.correct++;
      if (answeredAt > node.recency) node.recency = answeredAt;
    }
    tree.forEach((node) => {
      if (node.total < 1) return;
      const rawAccuracy = node.correct / node.total;
      node.accuracy = Math.round(rawAccuracy * 100);
      const daysSinceLastAnswer = (now - node.recency) / (1000 * 60 * 60 * 24);
      node.urgency = ((1 - rawAccuracy) * Math.log(node.total + 1)) + (daysSinceLastAnswer * 0.05);
    });
    setKnowledgeTree(tree);
    setIsDifficultyDataReady(true);
  }, [history]);

  // ─────────────────────────────────────────────
  // FILTRAGEM (Facetada + cache de "Meus Erros")
  // ─────────────────────────────────────────────
  const answeredQuestionIds = useMemo(
    () => new Set((history || []).map((h) => h.questionId)),
    [history]
  );
  const correctlyAnsweredIds = useMemo(
    () => new Set((history || []).filter((h) => h.isCorrect).map((h) => h.questionId)),
    [history]
  );

  // Filtro puramente local para "Meus Erros"
  const [mistakeQuestions, setMistakeQuestions] = useState<Question[] | null>(null);
  const [isLoadingMistakes, setIsLoadingMistakes] = useState(false);

  useEffect(() => {
    if ((filters as any).onlyWrong) {
      setIsLoadingMistakes(true);
      const mistookIds = new Set((history || []).filter(h => !h.isCorrect).map(h => h.questionId));
      const onlyWrongIds = [...mistookIds].filter(id => !correctlyAnsweredIds.has(id));
      const mistakes = questions.filter(q => q.id && onlyWrongIds.includes(q.id)) as Question[];
      setMistakeQuestions(mistakes);
      setIsLoadingMistakes(false);
    } else {
      setMistakeQuestions(null);
    }
  }, [(filters as any).onlyWrong, history, correctlyAnsweredIds, questions]);

  const questionPool: Question[] = useMemo(() => {
    if ((filters as any).onlyWrong) return mistakeQuestions || [];
    return (questions as Question[]) || [];
  }, [(filters as any).onlyWrong, mistakeQuestions, questions]);

  const hasHistory = history && history.length > 0;
  const filterCtxBase: ApplyFilterContext = useMemo(() => ({
    answeredQuestionIds: hasHistory ? answeredQuestionIds : undefined,
    correctlyAnsweredIds: hasHistory ? correctlyAnsweredIds : undefined,
  }), [hasHistory, answeredQuestionIds, correctlyAnsweredIds]);

  const facetOptions = useMemo(() => {
    return buildFacetOptions(questionPool, filters, {
      ...filterCtxBase,
      labelMaps: { categorias: GRANDES_AREAS_MAP },
    });
  }, [questionPool, filters, filterCtxBase]);

  const filteredQuestions = useMemo(() => {
    return applyAllFilters(questionPool, filters, filterCtxBase);
  }, [questionPool, filters, filterCtxBase]);

  const displayCount = filteredQuestions.length;
  const isComputingCount = ((filters as any).onlyWrong && isLoadingMistakes) || false;

  const grandesAreas = facetOptions.categorias;
  const anos        = facetOptions.anos;
  const especialidades = facetOptions.especialidades;
  const temas       = facetOptions.temas_especificos;
  const competencias = facetOptions.competencias;
  const bancas      = facetOptions.origens;
  const maxQuestionLimit = Math.min(250, displayCount);

  useEffect(() => { setShowUpdateWarning(questions.length === 0); }, [questions]);

  // ─────────────────────────────────────────────
  // AÇÕES DO HISTÓRICO DE PROVAS
  // ─────────────────────────────────────────────

  const handleRetakeSession = useCallback((session: QuizSession) => {
    onStartQuiz(session.total_questions, false, true, session.question_ids);
  }, [onStartQuiz]);

  const handleCopySessionFilters = useCallback((sessionFilters: FilterState) => {
    setCopiedFiltersFromSession(sessionFilters);
  }, []);

  const handlePasteFilters = useCallback(() => {
    if (copiedFiltersFromSession) setFilters(copiedFiltersFromSession);
  }, [copiedFiltersFromSession, setFilters]);

  const handleOpenSaveModal = useCallback((sessionId: string) => {
    setSessionIdBeingSaved(sessionId);
    setSaveSimulationName('');
    setShowSaveModal(true);
  }, []);

  const handleConfirmSave = useCallback(() => {
    if (!sessionIdBeingSaved || !saveSimulationName.trim()) return;
    
    const sessionToSave = recentExamHistory.find(s => s.id === sessionIdBeingSaved);
    if (sessionToSave) {
      const updatedSession = { ...sessionToSave, title: saveSimulationName, is_saved: true };
      saveQuizSessionLocal(updatedSession);
      
      setRecentExamHistory(prev => prev.filter(s => s.id !== sessionIdBeingSaved));
      setSavedSimulations(prev => [updatedSession, ...prev]);
    }
    setShowSaveModal(false);
  }, [sessionIdBeingSaved, saveSimulationName, recentExamHistory]);

  const handleDeleteSavedSimulation = useCallback((sessionId: string) => {
    if (!window.confirm("Tem certeza que deseja excluir este simulado salvo?")) return;
    deleteQuizSessionLocal(sessionId);
    setSavedSimulations(prev => prev.filter(s => s.id !== sessionId));
  }, []);

  const handleOpenConfigModal = useCallback(() => setShowConfigModal(true), []);

  // ─────────────────────────────────────────────
  // SELEÇÃO INTELIGENTE — Maps pré-calculados de urgência
  // ─────────────────────────────────────────────

  const urgencyMaps = useMemo(() => {
    const maps = {
      tema: new Map<string, number>(),
      especialidade: new Map<string, number>(),
      competencia: new Map<string, number>(),
      categoria: new Map<string, number>(),
    };

    if (knowledgeTree.size === 0) return maps;

    knowledgeTree.forEach((node) => {
      if (node.tema !== 'Geral') {
        const prev = maps.tema.get(node.tema) || 0;
        const score = node.urgency * 3.0;
        if (score > prev) maps.tema.set(node.tema, score);
      }
      if (node.especialidade !== 'Geral') {
        const prev = maps.especialidade.get(node.especialidade) || 0;
        const score = node.urgency * 2.0;
        if (score > prev) maps.especialidade.set(node.especialidade, score);
      }
      if (node.competencia !== 'Geral') {
        const priorityIndex = COMPETENCIA_PRIORITY_MAP.has(node.competencia)
          ? COMPETENCIA_PRIORITY_MAP.get(node.competencia)!
          : -1;
        const priorityBoost = priorityIndex >= 0 ? (COMPETENCIA_PRIORITY.length - priorityIndex) * 0.3 : 0;
        const prev = maps.competencia.get(node.competencia) || 0;
        const score = node.urgency * (1.5 + priorityBoost);
        if (score > prev) maps.competencia.set(node.competencia, score);
      }
      if (node.categoria !== 'Geral') {
        const prev = maps.categoria.get(node.categoria) || 0;
        const score = node.urgency * 1.0;
        if (score > prev) maps.categoria.set(node.categoria, score);
      }
    });

    return maps;
  }, [knowledgeTree]);

  const filteredQuestionsWithScore = useMemo(() => {
    if (knowledgeTree.size === 0) {
      return filteredQuestions.map(q => ({ id: q.id, urgency: 0 }));
    }
    return filteredQuestions.map(q => {
      const rawCategory = q.categoria || 'Geral';
      const normalizedCategory = CATEGORY_NAMES_INTERNAL[rawCategory] || rawCategory;
      const especialidade = (q as any).especialidade || 'Geral';
      const tema = q.tema_especifico || 'Geral';
      const competencia = (q as any).competencias || 'Geral';

      let score = 0;
      const exactMatch = knowledgeTree.get(`${normalizedCategory}::${especialidade}::${tema}::${competencia}`);
      if (exactMatch) score = Math.max(score, exactMatch.urgency * 4.0);

      score = Math.max(score, urgencyMaps.tema.get(tema) || 0);
      score = Math.max(score, urgencyMaps.especialidade.get(especialidade) || 0);
      score = Math.max(score, urgencyMaps.competencia.get(competencia) || 0);
      score = Math.max(score, urgencyMaps.categoria.get(normalizedCategory) || 0);

      return { id: q.id, urgency: score };
    });
  }, [filteredQuestions, knowledgeTree, urgencyMaps]);

  const buildSmartSortedIds = useCallback((chosenLimit: number): number[] => {
    const sorted = [...filteredQuestionsWithScore].sort((a, b) => {
      if (a.urgency > 0 && b.urgency > 0) return b.urgency - a.urgency;
      if (a.urgency > 0) return -1;
      if (b.urgency > 0) return 1;
      return Math.random() - 0.5;
    });
    return sorted.slice(0, chosenLimit).map(s => s.id as number);
  }, [filteredQuestionsWithScore]);

  const hasEnoughDataForSmartSelection = useMemo(() => {
    if (!history || !Array.isArray(history)) return false;
    return isDifficultyDataReady && knowledgeTree.size > 0 && history.length >= 10;
  }, [isDifficultyDataReady, knowledgeTree.size, history]);

  const handleStartQuiz = useCallback(() => {
    if (isSmartSelectionEnabled && hasEnoughDataForSmartSelection) {
      const sortedIds = buildSmartSortedIds(questionLimit);
      onStartQuiz(questionLimit, false, true, sortedIds);
    } else {
      onStartQuiz(questionLimit, true, false);
    }
    setShowConfigModal(false);
  }, [isSmartSelectionEnabled, hasEnoughDataForSmartSelection, questionLimit, buildSmartSortedIds, onStartQuiz]);

  const topDifficultyNodes = useMemo(() => {
    if (knowledgeTree.size === 0) return [];
    const nodes: KnowledgeNode[] = [];
    knowledgeTree.forEach(node => { if (node.total >= 1) nodes.push(node); });
    nodes.sort((a, b) => b.urgency - a.urgency);
    return nodes.slice(0, 3);
  }, [knowledgeTree]);

  const toggleFilter = useCallback((filterKey: string, filterValue: string) => {
    setFilters(prev => {
      const currentList = (prev as any)[filterKey] || [];
      const updatedList = currentList.includes(filterValue)
        ? currentList.filter((x: string) => x !== filterValue)
        : [...currentList, filterValue];
      return { ...prev, [filterKey]: updatedList };
    });
  }, [setFilters]);

  const handleAddSearchKeyword = useCallback(() => {
    if (!keywordSearchText.trim()) return;
    const keyword = keywordSearchText.trim();
    const existingKeywords = filters?.searchQueries || [];
    if (!existingKeywords.includes(keyword)) {
      setFilters(prev => ({ ...prev, searchQueries: [...(prev?.searchQueries || []), keyword] }));
    }
    setKeywordSearchText('');
  }, [keywordSearchText, filters, setFilters]);

  const handleRemoveSearchKeyword = useCallback((keyword: string) => {
    setFilters(prev => ({ ...prev, searchQueries: (prev?.searchQueries || []).filter(t => t !== keyword) }));
  }, [setFilters]);

  const clearAllFilters = useCallback(
    () => setFilters({
      categorias: [], temas_especificos: [], anos: [], origens: [],
      searchQueries: [], excludeCorrect: false, excludeSeen: false,
      onlyWrong: false, especialidades: [], competencias: [],
    } as any),
    [setFilters]
  );

  const dismissTutorial = useCallback(() => {
    setShowTutorial(false);
    localStorage.setItem('filterTutorialSeen', 'true');
  }, []);

  const handleToggleSection = useCallback((sectionName: string) => {
    setExpandedSectionsSet(prev => {
      const next = new Set(prev);
      if (next.has(sectionName)) next.delete(sectionName);
      else next.add(sectionName);
      return next;
    });
  }, []);

  const handleLimitInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const parsedValue = parseInt(e.target.value) || 0;
    setQuestionLimit(Math.min(maxQuestionLimit, Math.max(1, parsedValue)));
  }, [maxQuestionLimit]);

  const hasActiveFilters = useMemo(() => hasAnyActiveFilter(filters), [filters]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans">
      {/* TUTORIAL MODAL */}
      {showTutorial && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" style={{ animation: 'fadeIn 0.2s ease' }}>
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden" style={{ animation: 'scaleIn 0.25s ease' }}>
            <div className="bg-[#BD4234] p-6 text-white">
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest opacity-80 mb-3"><Info size={12} /> Guia rápido</div>
              <h2 className="text-xl font-bold leading-snug">Como montar seu simulado</h2>
              <p className="text-red-100 text-sm mt-2 leading-relaxed">Personalize sua experiência de estudo utilizando os filtros abaixo e foque no que importa.</p>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex gap-3 items-start"><div className="w-6 h-6 rounded bg-red-50 dark:bg-red-900/30 flex items-center justify-center text-[#BD4234] shrink-0 mt-0.5"><Play size={14} /></div><div><p className="text-sm font-semibold text-slate-700 dark:text-white">Monitor de Questões</p><p className="text-xs text-slate-500 mt-0.5">O botão principal exibe o total de questões disponíveis. Clique para iniciar.</p></div></div>
              <div className="flex gap-3 items-start"><div className="w-6 h-6 rounded bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 shrink-0 mt-0.5"><CheckCircle2 size={14} /></div><div><p className="text-sm font-semibold text-slate-700 dark:text-white">Filtros Rápidos</p><p className="text-xs text-slate-500 mt-0.5">Use "Inéditas" ou "Erros" para focar no que precisa revisar.</p></div></div>
              <div className="flex gap-3 items-start"><div className="w-6 h-6 rounded bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 shrink-0 mt-0.5"><Search size={14} /></div><div><p className="text-sm font-semibold text-slate-700 dark:text-white">Busca por Palavra-Chave</p><p className="text-xs text-slate-500 mt-0.5">Pesquise por termos no enunciado ou no tema específico da questão.</p></div></div>
              <div className="flex gap-3 items-start"><div className="w-6 h-6 rounded bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 shrink-0 mt-0.5"><Filter size={14} /></div><div><p className="text-sm font-semibold text-slate-700 dark:text-white">Filtros Avançados</p><p className="text-xs text-slate-500 mt-0.5">Combine Grandes Áreas, Especialidades, Temas, Competências e Bancas simultaneamente.</p></div></div>
              <button onClick={dismissTutorial} className="w-full py-3 bg-[#BD4234] text-white rounded-lg font-semibold text-sm hover:bg-[#a63a2e] transition-colors mt-2">Vamos praticar!</button>
            </div>
          </div>
        </div>
      )}

      {/* UPDATE WARNING */}
      {showUpdateWarning && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" style={{ animation: 'fadeIn 0.2s ease' }}>
          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl max-w-sm w-full text-center shadow-xl border border-slate-200 dark:border-slate-800">
            <div className="w-12 h-12 bg-amber-50 dark:bg-amber-900/30 text-amber-600 rounded-lg flex items-center justify-center mx-auto mb-4"><RefreshCw size={24} /></div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Atualização Necessária</h3>
            <p className="text-slate-500 text-sm mb-5">Nova versão do banco de questões detectada ou dados não carregados. Atualize a página.</p>
            <button onClick={() => window.location.reload()} className="w-full py-2.5 bg-[#BD4234] text-white rounded-lg font-semibold text-sm hover:bg-[#a63a2e] transition-colors">Atualizar Página</button>
          </div>
        </div>
      )}

      {/* MODAL SALVAR SIMULADO */}
      {showSaveModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Nomear Simulado</h3>
            <input
              autoFocus
              type="text"
              value={saveSimulationName}
              onChange={(e) => setSaveSimulationName(e.target.value)}
              placeholder="Ex: Revisão Cardiologia"
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-[#BD4234] mb-4 text-slate-900 dark:text-white"
            />
            <div className="flex gap-3">
              <button onClick={() => setShowSaveModal(false)} className="flex-1 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">Cancelar</button>
              <button onClick={handleConfirmSave} disabled={!saveSimulationName.trim()} className="flex-1 py-2.5 bg-[#BD4234] text-white rounded-lg font-semibold disabled:opacity-50 hover:bg-[#a63a2e] transition-colors">Salvar</button>
            </div>
          </div>
        </div>
      )}

      {/* CONTEÚDO PRINCIPAL */}
      <div className="max-w-2xl mx-auto px-4 pt-6 pb-32" style={{ animation: 'slideUp 0.4s ease' }}>

        {/* LOGO E PLANO - Modificado para remover ApexLogo */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2.5 mb-2">
            <span className="text-xl font-extrabold text-[#BD4234] tracking-tight">
              Plataforma de Questões
            </span>
          </div>
        </div>

        {/* HEADER */}
        <div className="text-center mb-6 min-h-[100px] flex flex-col justify-end animate-in fade-in duration-500">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {renderTextWithName(headerText.title)}
          </h1>
          <p className="text-slate-400 dark:text-slate-500 text-base sm:text-lg mt-3 max-w-lg mx-auto leading-relaxed">
            {renderTextWithName(headerText.subtitle)}
          </p>
        </div>

        <div className="mt-4 mb-6"><PromoBannerCarousel /></div>

        <div className="mt-6 space-y-3">
          {/* BOTÃO COLAR FILTRO */}
          {copiedFiltersFromSession && (
            <button
              onClick={handlePasteFilters}
              className="w-full flex items-center justify-center gap-2 py-2 mb-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 rounded-lg font-medium text-sm animate-pulse hover:animate-none transition-all"
            >
              <Clipboard size={16} /> Colar filtros copiados
            </button>
          )}

          {/* FILTROS RÁPIDOS */}
          <div className="grid grid-cols-2 gap-2">
            <ToggleChip label="Inéditas" icon={CheckCircle2} isActive={!!filters.excludeSeen} onClick={() => setFilters(p => ({ ...p, excludeSeen: !p.excludeSeen, excludeCorrect: false, onlyWrong: false }))} colorClass="bg-emerald-600" />
            <ToggleChip label="Meus Erros" icon={EyeOff} isActive={!!filters.onlyWrong} onClick={() => setFilters(p => { const isActivating = !p.onlyWrong; return isActivating ? { ...p, onlyWrong: true, excludeSeen: false, excludeCorrect: false } : { ...p, onlyWrong: false, excludeCorrect: false }; })} colorClass="bg-[#BD4234]" />
          </div>

          {/* BUSCA POR PALAVRA-CHAVE */}
          <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">Procurar por</label>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="text" value={keywordSearchText} onChange={(e) => setKeywordSearchText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddSearchKeyword()} placeholder="Digite um trecho da questão ou tema..." className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg py-2.5 pl-9 pr-10 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:border-[#BD4234] focus:ring-1 focus:ring-[#BD4234]/30 transition-all" />
              <button onClick={handleAddSearchKeyword} disabled={!keywordSearchText.trim()} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 bg-[#BD4234] text-white rounded-md hover:bg-[#a63a2e] disabled:opacity-40 transition-all"><Plus size={14} /></button>
            </div>
            {(filters?.searchQueries || []).length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {(filters?.searchQueries || []).map(tag => (
                  <span key={tag} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-red-50 dark:bg-red-900/20 text-[#BD4234] text-xs font-medium border border-red-100 dark:border-red-800/40">
                    {tag} <button onClick={() => handleRemoveSearchKeyword(tag)} className="hover:text-red-700 transition-colors"><X size={12} /></button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* DROPDOWNS DE FILTROS PRINCIPAIS */}
          <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-4 space-y-3">
            <SelectDropdown label="Disciplina (Grande Área)" items={grandesAreas} selectedItems={filters?.categorias || []} onToggle={(v) => toggleFilter('categorias', v)} placeholder="Todas as disciplinas" />
            <SelectDropdown label="Instituição / Banca" items={bancas} selectedItems={filters?.origens || []} onToggle={(v) => toggleFilter('origens', v)} placeholder="Todas as instituições" enableSearch />
            <SelectDropdown label="Ano" items={anos} selectedItems={filters?.anos || []} onToggle={(v) => toggleFilter('anos', v)} placeholder="Todos os anos" />
            <SelectDropdown label="Especialidade" items={especialidades} selectedItems={(filters as any)?.especialidades || []} onToggle={(v) => toggleFilter('especialidades', v)} placeholder="Todas as especialidades" enableSearch />
          </div>

          {/* BOTÃO FILTROS AVANÇADOS */}
          <button onClick={() => setShowAdvancedFilters(!showAdvancedFilters)} className={`w-full flex items-center justify-between px-4 py-3 rounded-lg border text-sm font-medium transition-all duration-200 ${showAdvancedFilters ? 'bg-red-50/50 dark:bg-red-900/10 border-[#BD4234]/30 text-[#BD4234]' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'}`}>
            <div className="flex items-center gap-2"><Filter size={16} /><span>Filtros avançados</span>{(((filters as any)?.competencias?.length || 0) + ((filters?.temas_especificos || []).length)) > 0 && (<span className="text-xs bg-[#BD4234] text-white px-1.5 py-0.5 rounded-full font-semibold">{((filters as any)?.competencias?.length || 0) + ((filters?.temas_especificos || []).length)}</span>)}</div><ChevronDown size={16} className={`transition-transform duration-200 ${showAdvancedFilters ? 'rotate-180' : ''}`} />
          </button>

          {/* PAINEL DE FILTROS AVANÇADOS (colapsável) */}
          <div className={`transition-all duration-300 ease-out overflow-hidden ${showAdvancedFilters ? 'max-h-[5000px] opacity-100' : 'max-h-0 opacity-0'}`}>
            <div className="space-y-3 pt-3">
              <FilterChipGroup title="Competências" icon={Brain} items={competencias} selectedItems={(filters as any)?.competencias || []} onToggle={(v) => toggleFilter('competencias', v)} />
              <FilterSection title="Grandes Áreas" icon={BookMarked} items={grandesAreas} selectedItems={filters?.categorias || []} onToggle={(v) => toggleFilter('categorias', v)} isOpen={expandedSectionsSet.has('grandes-areas')} onToggleOpen={() => handleToggleSection('grandes-areas')} enableSearch />
              <FilterSection title="Especialidades" icon={Stethoscope} items={especialidades} selectedItems={(filters as any)?.especialidades || []} onToggle={(v) => toggleFilter('especialidades', v)} isOpen={expandedSectionsSet.has('especialidades')} onToggleOpen={() => handleToggleSection('especialidades')} enableSearch />
              <FilterSection title="Temas Específicos" icon={BookOpen} items={temas} selectedItems={filters?.temas_especificos || []} onToggle={(v) => toggleFilter('temas_especificos', v)} isOpen={expandedSectionsSet.has('temas')} onToggleOpen={() => handleToggleSection('temas')} enableSearch />
              <FilterSection title="Bancas" icon={Building2} items={bancas} selectedItems={filters?.origens || []} onToggle={(v) => toggleFilter('origens', v)} isOpen={expandedSectionsSet.has('bancas')} onToggleOpen={() => handleToggleSection('bancas')} enableSearch />
              <FilterSection title="Anos" icon={Calendar} items={anos} selectedItems={filters?.anos || []} onToggle={(v) => toggleFilter('anos', v)} isOpen={expandedSectionsSet.has('anos')} onToggleOpen={() => handleToggleSection('anos')} enableSearch />
            </div>
          </div>

          {/* HISTÓRICO DE PROVAS */}
          <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden mt-3">
            <button onClick={() => handleToggleSection('history')} className="w-full flex items-center justify-between p-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
              <div className="flex items-center gap-2">
                <History size={16} className="text-slate-400" />
                <span className="font-medium text-sm text-slate-700 dark:text-slate-300">Histórico de Provas</span>
              </div>
              <ChevronDown size={16} className={`text-slate-400 transition-transform ${expandedSectionsSet.has('history') ? 'rotate-180' : ''}`} />
            </button>
            {expandedSectionsSet.has('history') && (
              <div className="px-3 pb-3 pt-1 border-t border-slate-100 dark:border-slate-800 max-h-64 overflow-y-auto space-y-2">
                {recentExamHistory.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-4">Nenhuma prova realizada recentemente.</p>
                ) : (
                  recentExamHistory.map(session => (
                    <div key={session.id} className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-700">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                            {new Date(session.created_at).toLocaleDateString('pt-BR')} às {new Date(session.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                          <p className="text-[10px] text-slate-500 mt-0.5">
                            {session.total_questions} questões • {session.score !== undefined ? `Acertos: ${session.score}` : 'Não finalizado'}
                          </p>
                        </div>
                        <button onClick={() => handleOpenSaveModal(session.id)} className="p-1.5 text-slate-400 hover:text-[#BD4234] hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors" title="Salvar Simulado">
                          <Save size={14} />
                        </button>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => handleRetakeSession(session)} className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded text-xs font-medium text-slate-600 dark:text-slate-200 hover:border-[#BD4234] hover:text-[#BD4234] transition-colors">
                          <Repeat size={12} /> Refazer
                        </button>
                        <button onClick={() => handleCopySessionFilters(session.filters)} className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded text-xs font-medium text-slate-600 dark:text-slate-200 hover:border-indigo-500 hover:text-indigo-500 transition-colors">
                          <Copy size={12} /> Copiar Filtro
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* MEUS SIMULADOS */}
          <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
            <button onClick={() => handleToggleSection('saved')} className="w-full flex items-center justify-between p-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
              <div className="flex items-center gap-2">
                <BookMarked size={16} className="text-slate-400" />
                <span className="font-medium text-sm text-slate-700 dark:text-slate-300">Meus Simulados</span>
                {savedSimulations.length > 0 && <span className="text-xs bg-[#BD4234] text-white px-1.5 py-0.5 rounded-full font-semibold">{savedSimulations.length}</span>}
              </div>
              <ChevronDown size={16} className={`text-slate-400 transition-transform ${expandedSectionsSet.has('saved') ? 'rotate-180' : ''}`} />
            </button>
            {expandedSectionsSet.has('saved') && (
              <div className="px-3 pb-3 pt-1 border-t border-slate-100 dark:border-slate-800 max-h-64 overflow-y-auto space-y-2">
                {savedSimulations.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-4">Nenhum simulado salvo.</p>
                ) : (
                  savedSimulations.map(session => (
                    <div key={session.id} className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-700 flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-slate-800 dark:text-white">{session.title || 'Sem título'}</p>
                          <span className="text-[10px] bg-slate-200 dark:bg-slate-700 px-1.5 rounded text-slate-600 dark:text-slate-300">{session.total_questions}Q</span>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-0.5">Criado em {new Date(session.created_at).toLocaleDateString('pt-BR')}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => handleRetakeSession(session)} className="p-2 bg-[#BD4234]/10 text-[#BD4234] rounded-lg hover:bg-[#BD4234]/20 transition-colors" title="Fazer Agora">
                          <Play size={16} className="fill-current" />
                        </button>
                        <button onClick={() => handleDeleteSavedSimulation(session.id)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* AÇÕES FINAIS */}
          <div className="space-y-2 pt-2">
            {hasActiveFilters && (
              <button onClick={clearAllFilters} className="w-full flex items-center justify-center gap-2 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-rose-500 hover:border-rose-200 dark:hover:border-rose-800 transition-all bg-white dark:bg-slate-900">
                <Trash2 size={14} /> Limpar filtros
              </button>
            )}
            <button onClick={handleOpenConfigModal} disabled={displayCount === 0 || isComputingCount || (!!filters.excludeSeen && isLoadingHistory)} className="w-full flex items-center justify-center gap-2 py-3 bg-[#BD4234] text-white rounded-lg font-semibold text-sm shadow-sm hover:bg-[#a63a2e] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all">
              {(isComputingCount || (!!filters.excludeSeen && isLoadingHistory)) ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
              <span>
                {(!!filters.excludeSeen && isLoadingHistory) ? 'Carregando histórico...' : isComputingCount ? 'Calculando...' : displayCount === 0 ? 'Nenhuma questão encontrada' : `Iniciar com ${displayCount} questões`}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* MODAL DE CONFIGURAÇÃO (quantidade + seleção inteligente) */}
      {showConfigModal && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowConfigModal(false)} style={{ animation: 'fadeIn 0.2s ease' }} />
          <div className="relative bg-white dark:bg-slate-900 w-full sm:max-w-md sm:rounded-xl rounded-t-2xl shadow-xl overflow-hidden border-t sm:border border-slate-200 dark:border-slate-800" style={{ animation: 'slideUp 0.3s ease' }}>
            <div className="px-6 pt-5 pb-4 bg-[#BD4234] text-white">
              <button onClick={() => setShowConfigModal(false)} className="absolute top-4 right-4 p-1.5 bg-white/15 hover:bg-white/25 rounded-full transition-colors"><X className="w-4 h-4" /></button>
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest opacity-80 mb-2"><Settings2 size={12} /> Configuração</div>
              <h2 className="text-lg font-bold leading-snug">Quantas questões<br />você quer resolver?</h2>
            </div>
            <div className="px-6 py-6 space-y-6">
              <div className="flex flex-col items-center">
                <input type="number" value={questionLimit === 0 ? '' : questionLimit} onChange={handleLimitInputChange} className="text-5xl font-bold text-slate-900 dark:text-white tracking-tight bg-transparent text-center w-full outline-none border-none p-0 m-0 focus:ring-0 placeholder-slate-200" />
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mt-1 bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 rounded-full">Questões selecionadas</span>
              </div>
              <div>
                <input type="range" min="1" max={maxQuestionLimit} value={questionLimit || 1} step={1} onChange={(e) => setQuestionLimit(parseInt(e.target.value))} className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full appearance-none cursor-pointer accent-[#BD4234]" />
                <div className="flex justify-between text-xs font-medium text-slate-400 mt-1"><span>1</span><span>{maxQuestionLimit} máx</span></div>
              </div>
              <div>
                <label className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-lg cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${isSmartSelectionEnabled ? 'bg-[#BD4234] text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'}`}><Zap size={16} /></div>
                    <div><span className="font-semibold text-sm text-slate-700 dark:text-slate-300 block">Seleção Inteligente</span><span className="text-[11px] text-slate-400 leading-tight block mt-0.5">{isSmartSelectionEnabled ? 'Prioriza questões onde você tem mais dificuldade' : 'Questões serão selecionadas aleatoriamente'}</span></div>
                  </div>
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${isSmartSelectionEnabled ? 'border-[#BD4234] bg-[#BD4234]' : 'border-slate-300 dark:border-slate-600'}`}>{isSmartSelectionEnabled && <CheckCircle2 size={12} className="text-white" />}</div>
                  <input type="checkbox" checked={isSmartSelectionEnabled} onChange={(e) => setIsSmartSelectionEnabled(e.target.checked)} className="hidden" />
                </label>
                {isSmartSelectionEnabled && hasEnoughDataForSmartSelection && topDifficultyNodes.length > 0 && !isLoadingDifficulty && (
                  <div className="mt-3 p-3 bg-amber-50/70 dark:bg-amber-900/10 border border-amber-200/60 dark:border-amber-800/30 rounded-lg" style={{ animation: 'fadeIn 0.25s ease' }}>
                    <div className="flex items-center gap-1.5 mb-2"><Brain size={12} className="text-amber-600 dark:text-amber-400" /><span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">Seus pontos de atenção</span></div>
                    <div className="space-y-1.5">
                      {topDifficultyNodes.map((node, index) => (
                        <div key={index} className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0 flex-1"><span className="text-[10px] font-black text-amber-500/60 shrink-0">#{index + 1}</span><span className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate">{node.tema !== 'Geral' ? node.tema : node.especialidade}</span></div>
                          <span className={`text-xs font-bold shrink-0 ${node.accuracy < 50 ? 'text-rose-600 dark:text-rose-400' : 'text-amber-600 dark:text-amber-400'}`}>{node.accuracy}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {isSmartSelectionEnabled && (isLoadingDifficulty || isLoadingHistory) && (
                  <div className="mt-3 flex items-center justify-center gap-2 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg"><Loader2 size={14} className="animate-spin text-[#BD4234]" /><span className="text-xs text-slate-500">{isLoadingHistory ? 'Carregando histórico...' : 'Analisando seu histórico...'}</span></div>
                )}
                {isSmartSelectionEnabled && !hasEnoughDataForSmartSelection && isDifficultyDataReady && !isLoadingDifficulty && (
                  <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg"><p className="text-xs text-slate-500 dark:text-slate-400 text-center">Sem dados suficientes ainda. Resolva pelo menos 10 questões para ativar a priorização inteligente.</p></div>
                )}
              </div>
              <button onClick={handleStartQuiz} className="w-full py-3.5 bg-[#BD4234] text-white rounded-lg font-semibold text-sm hover:bg-[#a63a2e] active:scale-[0.98] transition-all flex items-center justify-center gap-2">COMEÇAR <ArrowRight size={16} /></button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        @keyframes scaleIn{from{opacity:0;transform:scale(0.96)}to{opacity:1;transform:scale(1)}}
        @keyframes slideUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: #cbd5e1;
          border-radius: 20px;
        }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: #334155;
        }
      `}</style>
    </div>
  );
};

export default FilterScreen;
