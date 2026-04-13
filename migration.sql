-- 은우 스도쿠 게임 DB 마이그레이션
-- Supabase SQL Editor에서 실행하세요

-- 플레이어 테이블
CREATE TABLE players (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  avatar_emoji TEXT DEFAULT '😊',
  games_played INT DEFAULT 0,
  games_won INT DEFAULT 0,
  best_time_beginner INT,
  best_time_easy INT,
  best_time_medium INT,
  best_time_hard INT,
  current_level INT DEFAULT 1,
  total_score INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 게임 방 테이블
CREATE TABLE rooms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  host_id UUID REFERENCES players(id),
  puzzle JSONB NOT NULL,
  solution JSONB NOT NULL,
  difficulty TEXT NOT NULL DEFAULT 'easy',
  status TEXT NOT NULL DEFAULT 'waiting',
  started_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 방 참가자 테이블
CREATE TABLE room_players (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
  player_id UUID REFERENCES players(id),
  progress JSONB DEFAULT '[]'::jsonb,
  completion_pct INT DEFAULT 0,
  finished_at TIMESTAMPTZ,
  is_winner BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(room_id, player_id)
);

-- 게임 기록 테이블
CREATE TABLE game_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id UUID REFERENCES players(id),
  room_id UUID REFERENCES rooms(id),
  difficulty TEXT NOT NULL,
  completion_time INT,
  is_winner BOOLEAN DEFAULT false,
  score INT DEFAULT 0,
  played_at TIMESTAMPTZ DEFAULT now()
);

-- RLS 활성화
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_history ENABLE ROW LEVEL SECURITY;

-- 공개 접근 정책 (아이들 게임이므로 간단하게)
CREATE POLICY "public_players" ON players FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_rooms" ON rooms FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_room_players" ON room_players FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_game_history" ON game_history FOR ALL USING (true) WITH CHECK (true);

-- Realtime 활성화
ALTER PUBLICATION supabase_realtime ADD TABLE room_players;
ALTER PUBLICATION supabase_realtime ADD TABLE rooms;

-- 친구 메시지 테이블 (이야기 나누기)
CREATE TABLE IF NOT EXISTS friend_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  from_player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  to_player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_friend_messages_to ON friend_messages(to_player_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_friend_messages_pair ON friend_messages(from_player_id, to_player_id, created_at DESC);
ALTER TABLE friend_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_friend_messages" ON friend_messages FOR ALL USING (true) WITH CHECK (true);
ALTER PUBLICATION supabase_realtime ADD TABLE friend_messages;
