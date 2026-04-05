import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  AppView, Question, FilterState, UserHistoryItem, 
  QuizSession, QuestionSessionState 
} from './types';

// Componentes
import FilterScreen from './components/FilterScreen';
import ExamsScreen from './components/ExamsScreen';
import QuestionCard from './components/QuestionCard';
import QuizResultScreen from './components/QuizResultScreen';

// Dados e Persistência
import questionsData from './data/questions.json';
import { 
  getUserHistory, saveUserAnswer, 
  saveQuizSession, getActiveSession 
} from './services/storage';

// Ícones (Lucide-React)
import { Home, FileText, PieChart, Loader2 } from 'lucide-react';

function App() {
  // -- ESTADO GLOBAL --
  const [currentView, setCurrentView] = useState<AppView>('home');
  const [questions] = useState<Question[]>(questionsData as Question[]);
  const [history, setHistory] = useState<UserHistoryItem[]>([]);
  
  // -- ESTADO DO QUIZ ATUAL --
  const [activeQuestions, setActiveQuestions] = useState<Question[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [sessionState, setSessionState] = useState<Record<number, QuestionSessionState>>({});
  const [filters, setFilters] = useState<FilterState>({
    categorias: [], temas_especificos: [], anos: [], origens: [],
    searchQueries: [], excludeCorrect: false, excludeSeen: false,
  });

  // -- CARREGAMENTO INICIAL --
  useEffect(() => {
    const savedHistory = getUserHistory();
    setHistory(savedHistory);

    // Verifica se há um simulado em aberto para recuperar
    const active = getActiveSession();
    if (active && active.status === 'active') {
      // Opcional: Implementar lógica de recuperação aqui
    }
  }, []);

  // -- LÓGICA DE INÍCIO DE QUIZ --
  const handleStartQuiz = useCallback((
    limit: number, 
    randomize: boolean, 
    smartSelection: boolean, 
    smartSortedIds?: number[]
  ) => {
    let selected: Question[] = [];

    if (smartSelection && smartSortedIds) {
      // Mapeia os IDs selecionados pela lógica inteligente do FilterScreen
      selected = smartSortedIds
        .map(id => questions.find(q => q.id === id))
        .filter(Boolean) as Question[];
    } else {
      // Filtragem básica (o grosso da filtragem já vem do FilterScreen via filteredCount)
      // Aqui apenas garantimos a seleção final
      selected = [...questions]; 
      // Nota: No mundo real, aqui aplicaríamos os filtros novamente se necessário
      if (randomize) selected.sort(() => Math.random() - 0.5);
      selected = selected.slice(0, limit);
    }

    setActiveQuestions(selected);
    setSessionState({});
    setCurrentPage(1);
    setCurrentView('quiz');
  }, [questions]);

  // -- LÓGICA DE INÍCIO DE PROVA (EXAME) --
  const handleStartExam = useCallback((origem: string, ano: string) => {
    const examQuestions = questions.filter(q => q.origem === origem && q.ano === ano);
    setActiveQuestions(examQuestions);
    setSessionState({});
    setCurrentPage(1);
    setCurrentView('quiz');
  }, [questions]);

  // -- LÓGICA DE RESPOSTA --
  const handleAnswer = useCallback((isCorrect: boolean) => {
    const currentQ = activeQuestions[currentPage - 1];
    if (!currentQ) return;

    const answerItem: UserHistoryItem = {
      questionId: currentQ.id,
      isCorrect,
      userAnswer: isCorrect ? currentQ.correta : 'ERR',
      timestamp: Date.now(),
      category: currentQ.categoria
    };

    saveUserAnswer(answerItem);
    setHistory(prev => [...prev, answerItem]);
  }, [activeQuestions, currentPage]);

  const handleFinishQuiz = () => {
    setCurrentView('results');
  };

  // -- RENDERIZAÇÃO CONDICIONAL --
  const renderContent = () => {
    switch (currentView) {
      case 'home':
        return (
          <FilterScreen
            questions={questions}
            history={history}
            filters={filters}
            setFilters={setFilters}
            onStartQuiz={handleStartQuiz}
          />
        );
      case 'exams':
        return (
          <ExamsScreen 
            questions={questions} 
            history={history} 
            onStartExam={handleStartExam} 
          />
        );
      case 'quiz':
        const currentQ = activeQuestions[currentPage - 1];
        return (
          <QuestionCard
            question={currentQ}
            currentIndex={currentPage - 1}
            totalQuestions={activeQuestions.length}
            savedState={sessionState[currentQ.id]}
            onStateChange={(s) => setSessionState(prev => ({ ...prev, [currentQ.id]: s }))}
            onAnswer={handleAnswer}
            onNext={() => setCurrentPage(p => p + 1)}
            onBack={currentPage > 1 ? () => setCurrentPage(p => p - 1) : undefined}
            isLastQuestion={currentPage === activeQuestions.length}
            onFinish={handleFinishQuiz}
          />
        );
      case 'results':
        return (
          <QuizResultScreen
            questions={activeQuestions}
            sessionState={sessionState}
            timer={0} // Opcional: Adicionar cronômetro
            onRetry={() => setCurrentView('quiz')}
            onExit={() => setCurrentView('home')}
          />
        );
      default:
        return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin" /></div>;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
      <main className="pb-24">
        {renderContent()}
      </main>

      {/* NAVBAR INFERIOR (Apenas visível fora do modo Quiz) */}
      {currentView !== 'quiz' && currentView !== 'results' && (
        <nav className="fixed bottom-0 left-0 right-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-t border-slate-200 dark:border-slate-800 z-50">
          <div className="flex justify-around items-center h-16 max-w-md mx-auto">
            <button 
              onClick={() => setCurrentView('home')}
              className={`p-2 rounded-xl transition-all ${currentView === 'home' ? 'text-[#BD4234] bg-red-50 dark:bg-red-900/20' : 'text-slate-400'}`}
            >
              <Home size={24} />
            </button>
            <button 
              onClick={() => setCurrentView('exams')}
              className={`p-2 rounded-xl transition-all ${currentView === 'exams' ? 'text-[#BD4234] bg-red-50 dark:bg-red-900/20' : 'text-slate-400'}`}
            >
              <FileText size={24} />
            </button>
            <button 
              className="text-slate-300 cursor-not-allowed p-2" 
              title="Dashboard removido na versão Lite"
            >
              <PieChart size={24} />
            </button>
          </div>
        </nav>
      )}
    </div>
  );
}

export default App;
