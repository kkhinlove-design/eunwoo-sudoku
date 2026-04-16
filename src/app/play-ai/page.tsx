'use client';

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { generatePuzzle } from '@/lib/sudoku';
import SudokuBoard from '@/components/SudokuBoard';
import Timer from '@/components/Timer';
import Confetti from '@/components/Confetti';
import { startBGM, stopBGM } from '@/lib/sounds';
import { computeLevel } from '@/lib/level';

const DIFFICULTY_LABELS: Record<string, string> = {
  beginner: '입문 🌱',
  easy: '쉬움 ⭐',
  medium: '보통 ⭐⭐',
  hard: '어려움 ⭐⭐⭐',
};

const DIFFICULTY_COLORS: Record<string, string> = {
  beginner: 'bg-blue-100 text-blue-700',
  easy: 'bg-green-100 text-green-700',
  medium: 'bg-yellow-100 text-yellow-700',
  hard: 'bg-red-100 text-red-700',
};

const AI_LEVELS: Record<string, { label: string; emoji: string; description: string; solveInterval: number }> = {
  baby: { label: '아기 AI', emoji: '👶', description: '느리고 가끔 실수해요', solveInterval: 12000 },
  student: { label: '학생 AI', emoji: '🧑‍🎓', description: '적당한 속도로 풀어요', solveInterval: 6000 },
  genius: { label: '천재 AI', emoji: '🧠', description: '빠르고 정확해요', solveInterval: 3000 },
  robot: { label: '로봇 AI', emoji: '🤖', description: '매우 빠르고 절대 안 틀려요', solveInterval: 1500 },
};

const AI_LEVEL_COLORS: Record<string, string> = {
  baby: 'bg-pink-100 text-pink-700',
  student: 'bg-blue-100 text-blue-700',
  genius: 'bg-purple-100 text-purple-700',
  robot: 'bg-red-100 text-red-700',
};

function PlayAIContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const playerId = searchParams.get('player');

  const [player, setPlayer] = useState<{ id: string; name: string; avatar_emoji: string; current_level: number; games_played: number; games_won: number; total_score: number } | null>(null);
  const [difficulty, setDifficulty] = useState<string | null>(null);
  const [aiLevel, setAiLevel] = useState<string | null>(null);
  const [puzzle, setPuzzle] = useState<number[][] | null>(null);
  const [solution, setSolution] = useState<number[][] | null>(null);
  const [completed, setCompleted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [completionTime, setCompletionTime] = useState(0);
  const [score, setScore] = useState(0);
  const [bgmEnabled, setBgmEnabled] = useState(false);

  // AI 상태
  const [aiProgress, setAiProgress] = useState(0);
  const [aiFinished, setAiFinished] = useState(false);
  const [playerProgress, setPlayerProgress] = useState(0);
  const [result, setResult] = useState<'win' | 'lose' | null>(null);
  const aiIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const aiSolvedRef = useRef(0);
  const aiTotalRef = useRef(0);
  const gameActiveRef = useRef(false);

  // BGM 제어
  useEffect(() => {
    if (bgmEnabled && difficulty && !completed && !gameOver && !result) {
      startBGM();
    } else {
      stopBGM();
    }
    return () => stopBGM();
  }, [bgmEnabled, difficulty, completed, gameOver, result]);

  useEffect(() => {
    if (!playerId) { router.push('/'); return; }
    supabase.from('players').select('*').eq('id', playerId).single().then(({ data }) => {
      if (data) setPlayer(data);
      else router.push('/');
    });
  }, [playerId, router]);

  // AI 시뮬레이션 시작
  const startAI = useCallback((diff: string, aiLv: string) => {
    const config = AI_LEVELS[aiLv];
    if (!config) return;

    // 빈칸 수 계산
    const cellsToRemove: Record<string, number> = { beginner: 20, easy: 30, medium: 40, hard: 50 };
    const total = cellsToRemove[diff] || 30;
    aiTotalRef.current = total;
    aiSolvedRef.current = 0;
    setAiProgress(0);
    setAiFinished(false);
    gameActiveRef.current = true;

    // AI가 일정 간격으로 한 칸씩 풀기
    if (aiIntervalRef.current) clearInterval(aiIntervalRef.current);
    aiIntervalRef.current = setInterval(() => {
      if (!gameActiveRef.current) return;

      // 아기 AI는 가끔 한 턴 건너뜀 (실수 시뮬레이션)
      if (aiLv === 'baby' && Math.random() < 0.25) return;

      aiSolvedRef.current += 1;
      const pct = Math.min(100, Math.round((aiSolvedRef.current / aiTotalRef.current) * 100));
      setAiProgress(pct);

      if (aiSolvedRef.current >= aiTotalRef.current) {
        setAiFinished(true);
        gameActiveRef.current = false;
        if (aiIntervalRef.current) clearInterval(aiIntervalRef.current);
      }
    }, config.solveInterval);
  }, []);

  // AI가 먼저 완료하면 패배
  useEffect(() => {
    if (aiFinished && !completed && !gameOver && !result) {
      setResult('lose');
      gameActiveRef.current = false;
      if (aiIntervalRef.current) clearInterval(aiIntervalRef.current);
    }
  }, [aiFinished, completed, gameOver, result]);

  // 클린업
  useEffect(() => {
    return () => {
      if (aiIntervalRef.current) clearInterval(aiIntervalRef.current);
    };
  }, []);

  const startGame = (diff: string, aiLv: string) => {
    const { puzzle: p, solution: s } = generatePuzzle(diff);
    setDifficulty(diff);
    setAiLevel(aiLv);
    setPuzzle(p);
    setSolution(s);
    setCompleted(false);
    setGameOver(false);
    setResult(null);
    setPlayerProgress(0);
    startAI(diff, aiLv);
  };

  const handleProgress = useCallback((_grid: number[][], pct: number) => {
    setPlayerProgress(pct);
  }, []);

  const handleComplete = useCallback(async (timeSeconds: number) => {
    setCompleted(true);
    setCompletionTime(timeSeconds);
    gameActiveRef.current = false;
    if (aiIntervalRef.current) clearInterval(aiIntervalRef.current);

    if (!aiFinished) {
      setResult('win');
    }

    // 점수 계산
    const diffBonus = difficulty === 'beginner' ? 50 : difficulty === 'easy' ? 75 : difficulty === 'medium' ? 125 : 175;
    const aiBonus = aiLevel === 'baby' ? 50 : aiLevel === 'student' ? 75 : aiLevel === 'genius' ? 125 : 175;
    const timeBonus = Math.max(0, 175 - timeSeconds);
    const winBonus = 75;
    const totalScore = diffBonus + aiBonus + timeBonus + winBonus;
    setScore(totalScore);

    if (!player) return;

    const newWins = player.games_won + 1;
    const { level: newLevel } = computeLevel(newWins);
    const updates: Record<string, unknown> = {
      games_played: player.games_played + 1,
      games_won: newWins,
      total_score: player.total_score + totalScore,
      current_level: newLevel,
    };

    const bestKey = `best_time_${difficulty}` as string;
    const currentBest = (player as unknown as Record<string, number | null>)[bestKey];
    if (!currentBest || timeSeconds < currentBest) {
      updates[bestKey] = timeSeconds;
    }

    await supabase.from('players').update(updates).eq('id', player.id);

    await supabase.from('game_history').insert({
      player_id: player.id,
      difficulty,
      completion_time: timeSeconds,
      is_winner: true,
      score: totalScore,
    });
  }, [difficulty, aiLevel, aiFinished, player]);

  const handleGameOver = useCallback(async () => {
    setGameOver(true);
    setResult('lose');
    gameActiveRef.current = false;
    if (aiIntervalRef.current) clearInterval(aiIntervalRef.current);
    stopBGM();

    if (!player) return;

    // 패배 위로 점수: (난이도 + AI 보너스)의 40%
    const diffBonus = difficulty === 'beginner' ? 50 : difficulty === 'easy' ? 75 : difficulty === 'medium' ? 125 : 175;
    const aiBonus = aiLevel === 'baby' ? 50 : aiLevel === 'student' ? 75 : aiLevel === 'genius' ? 125 : 175;
    const consolation = Math.round((diffBonus + aiBonus) * 0.4);
    setScore(consolation);

    await supabase.from('players').update({
      games_played: player.games_played + 1,
      total_score: player.total_score + consolation,
    }).eq('id', player.id);

    await supabase.from('game_history').insert({
      player_id: player.id,
      difficulty,
      completion_time: null,
      is_winner: false,
      score: consolation,
    });
  }, [difficulty, aiLevel, player]);

  if (!player) return null;

  // ── 난이도 + AI 레벨 선택 화면 ──
  if (!difficulty || !aiLevel) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="game-card w-full max-w-md text-center">
          <div className="text-4xl mb-2">{player.avatar_emoji}</div>
          <h2 className="text-2xl font-bold text-purple-700 mb-1">AI 대결</h2>
          <p className="text-purple-400 mb-5">AI와 누가 먼저 푸는지 대결해봐!</p>

          {/* 퍼즐 난이도 선택 */}
          <div className="mb-5">
            <p className="text-sm text-purple-500 mb-2 font-semibold">퍼즐 난이도</p>
            <div className="flex flex-col gap-2">
              {(['beginner', 'easy', 'medium', 'hard'] as const).map(diff => (
                <button
                  key={diff}
                  onClick={() => setDifficulty(diff)}
                  className={`py-3 rounded-xl font-bold text-base transition-all ${
                    difficulty === diff
                      ? 'ring-2 ring-purple-500 scale-105 ' + DIFFICULTY_COLORS[diff]
                      : DIFFICULTY_COLORS[diff] + ' hover:scale-102'
                  }`}
                >
                  {DIFFICULTY_LABELS[diff]}
                </button>
              ))}
            </div>
          </div>

          {/* AI 레벨 선택 (난이도 선택 후 표시) */}
          {difficulty && (
            <div className="mb-5 animate-bounce-in">
              <p className="text-sm text-purple-500 mb-2 font-semibold">AI 상대 선택</p>
              <div className="flex flex-col gap-2">
                {Object.entries(AI_LEVELS).map(([key, config]) => (
                  <button
                    key={key}
                    onClick={() => startGame(difficulty, key)}
                    className={`py-3 px-4 rounded-xl font-bold text-base transition-all hover:scale-105 ${AI_LEVEL_COLORS[key]}`}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-xl">{config.emoji}</span>
                      <span>{config.label}</span>
                    </div>
                    <div className="text-xs font-normal mt-0.5 opacity-70">{config.description}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={() => router.push('/')}
            className="mt-2 text-purple-400 hover:text-purple-600"
          >
            ← 돌아가기
          </button>
        </div>
      </div>
    );
  }

  // ── 결과 화면 ──
  if (result) {
    const isWin = result === 'win';
    const mins = Math.floor(completionTime / 60);
    const secs = completionTime % 60;
    const aiConfig = AI_LEVELS[aiLevel];

    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        {isWin && <Confetti />}
        <div className="game-card w-full max-w-md text-center animate-bounce-in">
          <div className="text-6xl mb-4">{isWin ? '🏆' : '😢'}</div>
          <h2 className={`text-3xl font-bold mb-2 ${isWin ? 'text-purple-700' : 'text-red-500'}`}>
            {isWin ? 'AI를 이겼어!' : 'AI에게 졌어...'}
          </h2>
          <p className="text-lg text-purple-500 mb-4">
            {isWin
              ? `${player.name}(이)가 ${aiConfig.emoji} ${aiConfig.label}보다 빨랐어!`
              : `${aiConfig.emoji} ${aiConfig.label}(이)가 먼저 완성했어!`}
          </p>

          {/* 대결 결과 */}
          <div className="space-y-3 mb-4">
            <div className={`flex items-center gap-3 p-3 rounded-xl ${isWin ? 'bg-yellow-50 border-2 border-yellow-300' : 'bg-gray-50'}`}>
              <span className="text-lg font-bold">{isWin ? '🥇' : '🥈'}</span>
              <span className="text-2xl">{player.avatar_emoji}</span>
              <span className="font-bold text-purple-700 flex-1 text-left">{player.name}</span>
              <span className="text-sm text-purple-400">{isWin ? `${mins}분 ${secs}초` : `${playerProgress}%`}</span>
            </div>
            <div className={`flex items-center gap-3 p-3 rounded-xl ${!isWin ? 'bg-yellow-50 border-2 border-yellow-300' : 'bg-gray-50'}`}>
              <span className="text-lg font-bold">{!isWin ? '🥇' : '🥈'}</span>
              <span className="text-2xl">{aiConfig.emoji}</span>
              <span className="font-bold text-purple-700 flex-1 text-left">{aiConfig.label}</span>
              <span className="text-sm text-purple-400">{aiFinished ? '완료!' : `${aiProgress}%`}</span>
            </div>
          </div>

          {isWin && (
            <div className="bg-purple-50 rounded-xl p-3 mb-4">
              <div className="text-sm text-purple-400">획득 점수</div>
              <div className="text-xl font-bold text-purple-700">+{score}점</div>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <button onClick={() => startGame(difficulty, aiLevel)} className="btn-primary w-full">
              다시 대결! 💪
            </button>
            <button onClick={() => { setDifficulty(null); setAiLevel(null); setResult(null); setPuzzle(null); }} className="btn-secondary w-full">
              난이도/AI 변경
            </button>
            <button
              onClick={() => router.push('/')}
              className="text-purple-400 hover:text-purple-600 mt-1"
            >
              ← 로비로
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── 게임 플레이 화면 ──
  const aiConfig = AI_LEVELS[aiLevel];

  return (
    <div className="min-h-screen p-2 sm:p-4 pt-4 sm:pt-6">
      <div className="max-w-2xl mx-auto">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={() => {
              gameActiveRef.current = false;
              if (aiIntervalRef.current) clearInterval(aiIntervalRef.current);
              setDifficulty(null);
              setAiLevel(null);
              setPuzzle(null);
            }}
            className="text-purple-400 hover:text-purple-600 font-semibold"
          >
            ← 뒤로
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setBgmEnabled(prev => !prev)}
              className={`px-3 py-1 rounded-full text-sm font-bold transition-all ${
                bgmEnabled ? 'bg-purple-500 text-white' : 'bg-gray-100 text-gray-400'
              }`}
            >
              {bgmEnabled ? '🔊 BGM' : '🔇 BGM'}
            </button>
            <span className={`px-3 py-1 rounded-full text-sm font-bold ${DIFFICULTY_COLORS[difficulty]}`}>
              {DIFFICULTY_LABELS[difficulty]}
            </span>
          </div>
          <Timer running={!completed && !gameOver && !result} />
        </div>

        {/* AI vs 나 진행률 */}
        <div className="game-card mb-3 p-3">
          <p className="text-xs text-purple-400 font-semibold mb-2">실시간 대결</p>
          <div className="space-y-2">
            {/* 플레이어 */}
            <div className="flex items-center gap-2">
              <span className="text-lg">{player.avatar_emoji}</span>
              <span className="text-sm font-bold text-purple-700 w-16 truncate">{player.name}</span>
              <div className="progress-bar flex-1">
                <div className="progress-fill" style={{ width: `${playerProgress}%`, transition: 'width 0.3s ease' }} />
              </div>
              <span className="text-xs font-bold text-purple-500 w-10 text-right">{playerProgress}%</span>
            </div>
            {/* AI */}
            <div className="flex items-center gap-2">
              <span className="text-lg">{aiConfig.emoji}</span>
              <span className="text-sm font-bold text-purple-700 w-16 truncate">{aiConfig.label}</span>
              <div className="progress-bar flex-1">
                <div
                  className="progress-fill"
                  style={{
                    width: `${aiProgress}%`,
                    transition: 'width 0.3s ease',
                    background: 'linear-gradient(90deg, #f472b6, #ef4444)',
                  }}
                />
              </div>
              <span className="text-xs font-bold text-red-500 w-10 text-right">{aiProgress}%</span>
            </div>
          </div>
        </div>

        {/* 보드 */}
        {puzzle && solution && (
          <SudokuBoard
            puzzle={puzzle}
            solution={solution}
            onProgress={handleProgress}
            onComplete={handleComplete}
            onGameOver={handleGameOver}
          />
        )}
      </div>
    </div>
  );
}

export default function PlayAIPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="text-2xl text-purple-400">로딩 중...</div></div>}>
      <PlayAIContent />
    </Suspense>
  );
}
