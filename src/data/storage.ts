import type { ProjectData } from '../types';
import { MOCK_DATA } from './mockData';

const STORAGE_KEY = 'project_manager_data';

export function loadProjects(): ProjectData[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as ProjectData[];
  } catch {
    // fall through to default
  }
  saveProjects(MOCK_DATA);
  return MOCK_DATA;
}

export function saveProjects(projects: ProjectData[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
}
