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

export type Word = {
  clue: string;
  answer: string;
  orientation?: string;
};

export function pickConnectedWords(words: Word[], count: number): Word[] {
  if (count <= 0) return [];

  const byLetter: Record<string, Set<Word>> = {};
  for (const w of words) {
    for (const ch of new Set(w.answer)) {
      if (!byLetter[ch]) byLetter[ch] = new Set();
      byLetter[ch].add(w);
    }
  }

  // Seed with a random word
  const available = new Set(words);
  const result: Word[] = [];
  const seed = words[Math.floor(Math.random() * words.length)];
  result.push(seed);
  available.delete(seed);

  while (result.length < count && available.size > 0) {
    const connected = new Set<Word>();
    for (const w of result) {
      for (const ch of new Set(w.answer)) {
        for (const cand of byLetter[ch] ?? []) {
          if (available.has(cand)) connected.add(cand);
        }
      }
    }

    if (connected.size === 0) break; // cannot expand connection

    const next = Array.from(connected)[Math.floor(Math.random() * connected.size)];
    result.push(next);
    available.delete(next);
  }

  return result.length === count ? result : [];
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

type PositionOrientationLoopCallback = (
  data: {
    x: number,
    y: number,
    positionKey: string,
  },
  index: number,
) => void;

export const positionOrientationLoop = (
  { answer, orientation, startx, starty }: CrosswordResult,
  callback: PositionOrientationLoopCallback
) => {
  if (orientation === 'down') {
    for (let i = 0; i < answer.length; i++) {
      const downPositionKey = `${startx}-${starty + i}`;

      callback(
        { 
          x: startx,
          y: starty + i,
          positionKey: downPositionKey,
        },
        i,
      );
    }
  } else if (orientation === 'across') {
    for (let i = 0; i < answer.length; i++) {
      const acrossPositionKey = `${startx + i}-${starty}`;

      callback(
        { 
          x: startx + i,
          y: starty,
          positionKey: acrossPositionKey,
        },
        i,
      );
    }
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

export function intersectSets(a: Set<string>, b: Set<string>) {
  const result = new Set<string>();
  for (const v of a) if (b.has(v)) result.add(v);
  return result;
}