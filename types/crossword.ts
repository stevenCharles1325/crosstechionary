export type CrosswordResult = {
  clue: string;
  answer: string;
  startx: number,
  starty: number;
  position: number;
  orientation: 'across' | 'down';
}

export interface CrosswordLayout {
  rows: number;
  columns: number;
  table: string[][];
  result: CrosswordResult[];
}

export type GuessWord = {
  wordPosition: number;
  guessWord: string;
}

export type PositionKey = string;
export type CellDirection = { right?: string, down?: string, left?: string, up?: string };
export type WordsGroup = { across: CrosswordResult[], down: CrosswordResult[] };

export interface GameState {
  id: number;
  level: number;
  timeStart: Date;
  guessingWords: Pick<CrosswordLayout['result'][number], 'clue' | 'answer'>[];
  mistakesCount: Number;
  correctWords: string[];
  filledCells: string[];
}
