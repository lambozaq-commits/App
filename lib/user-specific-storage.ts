import { loadFromLocalStorage, saveToLocalStorage, getCurrentUserId } from './data-storage';

// Projects storage
export function loadProjects(): string[] {
  const userId = getCurrentUserId();
  return loadFromLocalStorage<string[]>('todo-projects', userId, ['Inbox']);
}

export function saveProjects(projects: string[]): void {
  const userId = getCurrentUserId();
  saveToLocalStorage('todo-projects', projects, userId);
}

// Project sharing storage
export function loadProjectSharing(): { [projectId: string]: string[] } {
  const userId = getCurrentUserId();
  return loadFromLocalStorage<{ [projectId: string]: string[] }>('project-sharing', userId, {});
}

export function saveProjectSharing(sharing: { [projectId: string]: string[] }): void {
  const userId = getCurrentUserId();
  saveToLocalStorage('project-sharing', sharing, userId);
}

// Journal entries storage
export function loadJournalEntries(): any[] {
  const userId = getCurrentUserId();
  return loadFromLocalStorage<any[]>('journal-entries', userId, []);
}

export function saveJournalEntries(entries: any[]): void {
  const userId = getCurrentUserId();
  saveToLocalStorage('journal-entries', entries, userId);
}

// Budget data storage
export function loadBudgetData(): any {
  const userId = getCurrentUserId();
  return loadFromLocalStorage<any>('budget-data', userId, { tables: [], categories: [] });
}

export function saveBudgetData(data: any): void {
  const userId = getCurrentUserId();
  saveToLocalStorage('budget-data', data, userId);
}

// Focus sessions storage
export function loadFocusSessions(): any[] {
  const userId = getCurrentUserId();
  return loadFromLocalStorage<any[]>('focus-sessions', userId, []);
}

export function saveFocusSessions(sessions: any[]): void {
  const userId = getCurrentUserId();
  saveToLocalStorage('focus-sessions', sessions, userId);
}

// Focus statistics storage
export function loadFocusStats(): any {
  const userId = getCurrentUserId();
  return loadFromLocalStorage<any>('focus-statistics', userId, {
    today: 0,
    week: 0,
    allTime: 0,
  });
}

export function saveFocusStats(stats: any): void {
  const userId = getCurrentUserId();
  saveToLocalStorage('focus-statistics', stats, userId);
}
