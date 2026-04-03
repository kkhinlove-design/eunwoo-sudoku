// 스도쿠 퍼즐 생성기

type Grid = number[][];

// 빈 9x9 그리드 생성
function createEmptyGrid(): Grid {
  return Array.from({ length: 9 }, () => Array(9).fill(0));
}

// 특정 위치에 숫자를 놓을 수 있는지 확인
function isValid(grid: Grid, row: number, col: number, num: number): boolean {
  // 같은 행 확인
  for (let c = 0; c < 9; c++) {
    if (grid[row][c] === num) return false;
  }
  // 같은 열 확인
  for (let r = 0; r < 9; r++) {
    if (grid[r][col] === num) return false;
  }
  // 같은 3x3 박스 확인
  const boxRow = Math.floor(row / 3) * 3;
  const boxCol = Math.floor(col / 3) * 3;
  for (let r = boxRow; r < boxRow + 3; r++) {
    for (let c = boxCol; c < boxCol + 3; c++) {
      if (grid[r][c] === num) return false;
    }
  }
  return true;
}

// 배열 셔플 (Fisher-Yates)
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// 백트래킹으로 완전한 스도쿠 생성
function fillGrid(grid: Grid): boolean {
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      if (grid[row][col] === 0) {
        const nums = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);
        for (const num of nums) {
          if (isValid(grid, row, col, num)) {
            grid[row][col] = num;
            if (fillGrid(grid)) return true;
            grid[row][col] = 0;
          }
        }
        return false;
      }
    }
  }
  return true;
}

// 난이도별 제거할 셀 수
const CELLS_TO_REMOVE: Record<string, number> = {
  easy: 30,
  medium: 40,
  hard: 50,
};

// 스도쿠 퍼즐 생성
export function generatePuzzle(difficulty: string = 'easy'): {
  puzzle: Grid;
  solution: Grid;
} {
  const solution = createEmptyGrid();
  fillGrid(solution);

  // 깊은 복사로 퍼즐 생성
  const puzzle: Grid = solution.map((row) => [...row]);

  // 난이도에 따라 셀 제거
  const toRemove = CELLS_TO_REMOVE[difficulty] || 30;
  const positions = shuffle(
    Array.from({ length: 81 }, (_, i) => [Math.floor(i / 9), i % 9])
  );

  for (let i = 0; i < toRemove; i++) {
    const [row, col] = positions[i];
    puzzle[row][col] = 0;
  }

  return { puzzle, solution };
}

// 사용자 입력 검증
export function validateMove(
  solution: Grid,
  row: number,
  col: number,
  value: number
): boolean {
  return solution[row][col] === value;
}

// 퍼즐 완성 확인
export function isPuzzleComplete(grid: Grid): boolean {
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      if (grid[row][col] === 0) return false;
    }
  }
  return true;
}

// 진행률 계산
export function calculateProgress(puzzle: Grid, current: Grid): number {
  let total = 0;
  let filled = 0;
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      if (puzzle[row][col] === 0) {
        total++;
        if (current[row][col] !== 0) filled++;
      }
    }
  }
  return total === 0 ? 100 : Math.round((filled / total) * 100);
}
