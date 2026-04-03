'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

const AVATARS = ['😊', '🦊', '🐱', '🐶', '🐰', '🐼', '🦁', '🐸', '🐵', '🦄', '🐯', '🐮'];

export default function Home() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState('😊');
  const [player, setPlayer] = useState<{ id: string; name: string; avatar_emoji: string; games_played: number; games_won: number; total_score: number; current_level: number } | null>(null);
  const [roomCode, setRoomCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // 로컬스토리지에서 플레이어 정보 복원
  useEffect(() => {
    const saved = localStorage.getItem('sudoku_player_id');
    if (saved) {
      supabase.from('players').select('*').eq('id', saved).single().then(({ data }) => {
        if (data) setPlayer(data);
      });
    }
  }, []);

  // 로그인 (이름 입력)
  const handleLogin = async () => {
    if (!name.trim()) return;
    setLoading(true);
    setError('');

    try {
      // 기존 유저 확인
      const { data: existing } = await supabase
        .from('players')
        .select('*')
        .eq('name', name.trim())
        .single();

      if (existing) {
        // 아바타 업데이트
        await supabase.from('players').update({ avatar_emoji: selectedAvatar }).eq('id', existing.id);
        existing.avatar_emoji = selectedAvatar;
        setPlayer(existing);
        localStorage.setItem('sudoku_player_id', existing.id);
      } else {
        // 새 유저 생성
        const { data: newPlayer, error: insertErr } = await supabase
          .from('players')
          .insert({ name: name.trim(), avatar_emoji: selectedAvatar })
          .select()
          .single();

        if (insertErr) throw insertErr;
        setPlayer(newPlayer);
        localStorage.setItem('sudoku_player_id', newPlayer.id);
      }
    } catch {
      setError('이름을 다시 확인해주세요!');
    } finally {
      setLoading(false);
    }
  };

  // 방 만들기
  const handleCreateRoom = () => {
    if (!player) return;
    router.push(`/room/new?player=${player.id}`);
  };

  // 방 참가하기
  const handleJoinRoom = () => {
    if (!player || !roomCode.trim()) return;
    router.push(`/room/${roomCode.trim().toUpperCase()}?player=${player.id}`);
  };

  // 혼자 하기
  const handleSoloPlay = () => {
    if (!player) return;
    router.push(`/play?player=${player.id}`);
  };

  // 로그아웃
  const handleLogout = () => {
    setPlayer(null);
    setName('');
    localStorage.removeItem('sudoku_player_id');
  };

  // 로그인 전 화면
  if (!player) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="game-card w-full max-w-md text-center">
          <div className="text-6xl mb-4">🧩</div>
          <h1 className="text-3xl font-bold text-purple-700 mb-2">
            은우의 스도쿠
          </h1>
          <p className="text-purple-400 mb-6">친구들과 함께 즐기는 스도쿠!</p>

          {/* 아바타 선택 */}
          <div className="mb-4">
            <p className="text-sm text-purple-500 mb-2 font-semibold">캐릭터를 골라봐!</p>
            <div className="flex flex-wrap justify-center gap-2">
              {AVATARS.map(emoji => (
                <button
                  key={emoji}
                  onClick={() => setSelectedAvatar(emoji)}
                  className={`text-2xl p-2 rounded-xl transition-all ${
                    selectedAvatar === emoji
                      ? 'bg-purple-100 scale-125 shadow-md'
                      : 'hover:bg-purple-50'
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* 이름 입력 */}
          <div className="mb-4">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              placeholder="이름을 입력해줘! (예: 은우)"
              className="w-full px-4 py-3 rounded-xl border-2 border-purple-200 focus:border-purple-500 focus:outline-none text-center text-lg font-semibold"
              maxLength={10}
            />
          </div>

          {error && (
            <p className="text-red-400 text-sm mb-3">{error}</p>
          )}

          <button
            onClick={handleLogin}
            disabled={loading || !name.trim()}
            className="btn-primary w-full disabled:opacity-50"
          >
            {loading ? '접속 중...' : `${selectedAvatar} 시작하기!`}
          </button>
        </div>
      </div>
    );
  }

  // 로그인 후 로비
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="game-card w-full max-w-md">
        {/* 프로필 */}
        <div className="text-center mb-6">
          <div className="text-5xl mb-2">{player.avatar_emoji}</div>
          <h2 className="text-2xl font-bold text-purple-700">{player.name}</h2>
          <div className="flex justify-center gap-4 mt-2 text-sm text-purple-400">
            <span>레벨 {player.current_level}</span>
            <span>|</span>
            <span>{player.games_played}게임</span>
            <span>|</span>
            <span>{player.games_won}승</span>
          </div>
          <div className="mt-2">
            <span className="text-yellow-500 font-bold">{player.total_score}점</span>
          </div>
        </div>

        {/* 메뉴 */}
        <div className="flex flex-col gap-3">
          {/* 혼자 하기 */}
          <button onClick={handleSoloPlay} className="btn-primary w-full text-lg">
            🎮 혼자 연습하기
          </button>

          {/* 방 만들기 */}
          <button onClick={handleCreateRoom} className="btn-secondary w-full text-lg">
            🏠 방 만들기
          </button>

          {/* 방 참가 */}
          <div className="flex gap-2">
            <input
              type="text"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === 'Enter' && handleJoinRoom()}
              placeholder="방 코드 입력"
              className="flex-1 px-4 py-3 rounded-xl border-2 border-pink-200 focus:border-pink-500 focus:outline-none text-center font-bold text-lg uppercase"
              maxLength={4}
            />
            <button
              onClick={handleJoinRoom}
              disabled={!roomCode.trim()}
              className="btn-secondary disabled:opacity-50 px-6"
            >
              입장!
            </button>
          </div>
        </div>

        {/* 로그아웃 */}
        <button
          onClick={handleLogout}
          className="mt-4 text-sm text-purple-300 hover:text-purple-500 w-full text-center"
        >
          다른 이름으로 접속하기
        </button>
      </div>
    </div>
  );
}
