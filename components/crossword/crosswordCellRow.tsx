import React from "react";
import { CrossWordCell, CrossWordCellProps } from "./crosswordCell";

interface CrosswordCellRowProps {
  cell: string;
  rowIndex: number;
  cellIndex: number;
  correctCells: Set<string>;
  incorrectCells: Set<string>;
  highlightedCells: Set<string>;
  wordPositions: Record<string, number[]>;
  cellsRef: CrossWordCellProps['cellsRef'];
  gesture: CrossWordCellProps['gesture'];
  onKeyPress: CrossWordCellProps['onKeyPress'];
}

export const CrosswordCellRow = React.memo((props: CrosswordCellRowProps) => {
  const {
    rowIndex,
    cellIndex,
    cell,
    cellsRef,
    correctCells,
    incorrectCells,
    highlightedCells,
    wordPositions,
    gesture,
    onKeyPress,
  } = props;

  const starty = rowIndex + 1;
  const startx = cellIndex + 1;
  const positionKey = `${startx}-${starty}`;

  return (
    <CrossWordCell
      cell={cell}
      value={cellsRef.current[positionKey]?.value ?? ''}
      cellsRef={cellsRef}
      rowIndex={rowIndex}
      cellIndex={cellIndex}
      positionKey={positionKey}
      hasBeenGuessed={correctCells.has(positionKey)}
      isEditable={!correctCells.has(positionKey)}
      shouldShake={incorrectCells.has(positionKey)}
      wordPositions={wordPositions[positionKey]}
      shouldHighlight={highlightedCells.has(positionKey)}
      gesture={gesture}
      onKeyPress={onKeyPress}
    />
  );
});