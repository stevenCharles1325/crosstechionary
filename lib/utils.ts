import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { CrosswordResult, GameState } from "~/types/crossword";
import { MMKV } from 'react-native-mmkv';

const storage = new MMKV({ id: 'crossword_game', encryptionKey: 'crosstechionary_key' });

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

export const CrosswordState = {
  saveState(state: GameState) {
    storage.set('currentGame', JSON.stringify(state));
  },

  loadState(): GameState | null {
    const json = storage.getString('currentGame');
    return json ? JSON.parse(json) : null;
  },

  clearState() {
    storage.delete('currentGame');
  }
}