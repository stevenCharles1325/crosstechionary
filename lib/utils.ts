import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { CrosswordResult, GameState } from "~/types/crossword";
import AsyncStorage from '@react-native-async-storage/async-storage';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const getPositionKey = (word: CrosswordResult) => {
  return `${word.startx}-${word.starty}`;
}

export const isAdjacent = (positionKeyA: string, positionKeyB: string) => {
  if (!positionKeyA || !positionKeyB) return false;

  const [startxA, startyA] = positionKeyA.split('-'); 
  const [startxB, startyB] = positionKeyB.split('-'); 

  return startxA === startxB || startyA === startyB;
}

export function pickShuffledWords<T>(arr: T[], count: number): T[] {
  const shuffled = [...arr];

  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled.slice(0, count);
}

export const getDifficultyFromLevel = (level: number) => {
  switch (level) {
    case 1:
      return 3;

    case 2:
      return 6;

    case 3:
      return 10;

    default:
      return 10;
  }
}

export const CrosswordState = {
  stateKey: 'gameStates',

  async saveState(state: GameState) {
    const states = (await this.loadStates()) ?? [];
    const lastIndex = states.length - 1;
    const previousState = states[lastIndex] ?? null;

    if (previousState && previousState.id === state.id) {
      states[lastIndex] = state;
    } else {
      states.push(state);
    }
    
    await AsyncStorage.setItem(this.stateKey, JSON.stringify(states));
  },

  async loadStates(): Promise<GameState[] | null> {
    const json = await AsyncStorage.getItem(this.stateKey);
    return (json ? JSON.parse(json) : null) as GameState[] | null;
  },

  async loadState(): Promise<GameState | null> {
    const json = await AsyncStorage.getItem(this.stateKey);
    const states = json ? JSON.parse(json) : [];

    return states[states.length - 1];
  },

  clearState() {
    AsyncStorage.removeItem(this.stateKey);
  }
}