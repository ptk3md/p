// src/services/storage.ts
import { UserHistoryItem, QuizSession } from '../types';

const HISTORY_KEY = 'apexmed_lite_history';
const SESSIONS_KEY = 'apexmed_lite_sessions';

// --- HISTÓRICO DE RESPOSTAS ---

export const getUserHistory = (): UserHistoryItem[] => {
  try {
    const data = localStorage.getItem(HISTORY_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

export const saveUserAnswer = (item: UserHistoryItem): void => {
  try {
    const history = getUserHistory();
    history.push(item);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  } catch (e) {
    console.error("Erro ao salvar resposta localmente", e);
  }
};

// --- SESSÕES E SIMULADOS ---

export const getQuizSessions = (): QuizSession[] => {
  try {
    const data = localStorage.getItem(SESSIONS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

export const saveQuizSession = (session: QuizSession): void => {
  try {
    const sessions = getQuizSessions();
    const index = sessions.findIndex(s => s.id === session.id);
    
    if (index >= 0) {
      sessions[index] = session;
    } else {
      sessions.push(session);
    }
    
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
  } catch (e) {
    console.error("Erro ao salvar sessão localmente", e);
  }
};

export const getActiveSession = (): QuizSession | null => {
  const sessions = getQuizSessions();
  return sessions.find(s => s.status === 'active') || null;
};

export const deleteQuizSession = (sessionId: string): void => {
  try {
    const sessions = getQuizSessions();
    const filtered = sessions.filter(s => s.id !== sessionId);
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(filtered));
  } catch (e) {
    console.error("Erro ao deletar sessão localmente", e);
  }
};
