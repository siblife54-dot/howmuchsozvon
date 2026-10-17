import Decimal from 'decimal.js';
Decimal.set({ precision: 40 });
export type Person = { id: string; name: string; salary: number; color: number };
export type Scenario = { people: Person[]; minutes: number; meetings: number; hours: number; excluded: string[] };
export type Saved = { version: 1; current: Scenario; before: Scenario | null; mode: 'calculate' | 'compare'; example: boolean };
export const STORAGE_KEY = 'sozvon:v1';
export const colors = ['#b6bbf1', '#ed9c80', '#b7cf9d', '#eed28a', '#a6cbd1', '#d4b4d6'];
export const demo = (): Scenario => ({ people: [
  { id: '1', name: 'Алексей · руководитель', salary: 180000, color: 0 },
  { id: '2', name: 'Мария · дизайнер', salary: 120000, color: 1 },
  { id: '3', name: 'Иван · разработчик', salary: 160000, color: 2 },
  { id: '4', name: 'Анна · маркетолог', salary: 100000, color: 3 },
  { id: '5', name: 'Денис · менеджер', salary: 90000, color: 4 },
  { id: '6', name: 'Ольга · аналитик', salary: 130000, color: 5 },
], minutes: 60, meetings: 20, hours: 160, excluded: [] });
export const clone = (s: Scenario): Scenario => structuredClone(s);
export const activePeople = (s: Scenario) => s.people.filter(p => !s.excluded.includes(p.id));
export function calculate(s: Scenario) {
  const people = activePeople(s);
  const salary = people.reduce((sum, p) => sum.plus(p.salary), new Decimal(0));
  const hourly = salary.div(s.hours);
  const meeting = hourly.times(s.minutes).div(60);
  const monthly = meeting.times(s.meetings);
  return { hourly, meeting, monthly, yearly: monthly.times(12), personHours: new Decimal(people.length).times(s.minutes).times(s.meetings).div(60), count: people.length };
}
export function difference(before: Scenario, after: Scenario) {
  const a = calculate(before), b = calculate(after);
  const monthly = a.monthly.minus(b.monthly);
  return { monthly, yearly: monthly.times(12), personHours: a.personHours.minus(b.personHours), percent: a.monthly.isZero() ? null : monthly.div(a.monthly).times(100) };
}
export const number = (v: Decimal.Value, digits = 0) => new Intl.NumberFormat('ru-RU', { maximumFractionDigits: digits }).format(new Decimal(v).toNumber());
export const rub = (v: Decimal.Value) => `${number(v)} ₽`;
export function validScenario(v: unknown): v is Scenario {
  if (!v || typeof v !== 'object') return false;
  const s = v as Scenario;
  const bounded = (n: unknown, min: number, max: number) => typeof n === 'number' && Number.isFinite(n) && n >= min && n <= max;
  return Array.isArray(s.people) && s.people.length <= 12 && s.people.every(p => p && typeof p.id === 'string' && typeof p.name === 'string' && p.name.trim().length > 0 && p.name.length <= 60 && bounded(p.salary, 0, 10000000) && bounded(p.color, 0, 5) && Number.isInteger(p.color)) && new Set(s.people.map(p => p.id)).size === s.people.length && Array.isArray(s.excluded) && s.excluded.every(id => typeof id === 'string' && s.people.some(p => p.id === id)) && bounded(s.minutes, 5, 240) && bounded(s.meetings, 0, 100) && bounded(s.hours, 1, 744);
}
export function loadState(): Saved {
  const fallback: Saved = { version: 1, current: demo(), before: null, mode: 'calculate', example: true };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    const s = JSON.parse(raw);
    if (s.version !== 1 || !validScenario(s.current) || (s.before !== null && !validScenario(s.before)) || !['calculate', 'compare'].includes(s.mode) || (s.mode === 'compare' && !s.before)) return fallback;
    return { ...s, example: s.example === true };
  } catch { return fallback; }
}
