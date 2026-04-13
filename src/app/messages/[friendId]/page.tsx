'use client';

import { useState, useEffect, useRef, use } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Player {
  id: string;
  name: string;
  avatar_emoji: string;
}

interface Message {
  id: string;
  from_player_id: string;
  to_player_id: string;
  content: string;
  created_at: string;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  if (sameDay) return `${hh}:${mm}`;
  return `${d.getMonth() + 1}/${d.getDate()} ${hh}:${mm}`;
}

export default function MessagesPage({ params }: { params: Promise<{ friendId: string }> }) {
  const { friendId } = use(params);
  const router = useRouter();
  const [me, setMe] = useState<Player | null>(null);
  const [friend, setFriend] = useState<Player | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const savedId = localStorage.getItem('sudoku_player_id');
    if (!savedId) {
      router.push('/');
      return;
    }

    (async () => {
      const [{ data: meData }, { data: friendData }] = await Promise.all([
        supabase.from('players').select('id, name, avatar_emoji').eq('id', savedId).single(),
        supabase.from('players').select('id, name, avatar_emoji').eq('id', friendId).single(),
      ]);
      if (!meData || !friendData) {
        setError('친구를 찾을 수 없어요!');
        return;
      }
      setMe(meData);
      setFriend(friendData);
      loadMessages(meData.id, friendData.id);
    })();
  }, [friendId, router]);

  const loadMessages = async (meId: string, otherId: string) => {
    const { data } = await supabase
      .from('friend_messages')
      .select('*')
      .or(
        `and(from_player_id.eq.${meId},to_player_id.eq.${otherId}),and(from_player_id.eq.${otherId},to_player_id.eq.${meId})`
      )
      .order('created_at', { ascending: true });
    if (data) setMessages(data);
  };

  // 실시간 구독
  useEffect(() => {
    if (!me || !friend) return;
    const channel = supabase
      .channel(`friend_messages_${me.id}_${friend.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'friend_messages' },
        (payload) => {
          const msg = payload.new as Message;
          const isRelevant =
            (msg.from_player_id === me.id && msg.to_player_id === friend.id) ||
            (msg.from_player_id === friend.id && msg.to_player_id === me.id);
          if (isRelevant) {
            setMessages((prev) =>
              prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]
            );
          }
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [me, friend]);

  // 새 메시지 도착 시 스크롤
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!me || !friend || !text.trim() || sending) return;
    setSending(true);
    setError('');
    const content = text.trim().slice(0, 500);
    const { data, error: err } = await supabase
      .from('friend_messages')
      .insert({
        from_player_id: me.id,
        to_player_id: friend.id,
        content,
      })
      .select()
      .single();
    if (err) {
      setError('메시지를 보내지 못했어요.');
    } else if (data) {
      setMessages((prev) => (prev.some((m) => m.id === data.id) ? prev : [...prev, data]));
      setText('');
    }
    setSending(false);
  };

  if (error && !friend) {
    return (
      <div className="min-h-screen p-4 py-8">
        <div className="max-w-md mx-auto game-card text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <Link href="/" className="btn-primary inline-block">돌아가기</Link>
        </div>
      </div>
    );
  }

  if (!me || !friend) {
    return (
      <div className="min-h-screen p-4 py-8">
        <div className="max-w-md mx-auto game-card text-center text-purple-400">
          불러오는 중...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 py-6">
      <div className="max-w-md mx-auto">
        {/* 헤더 */}
        <div className="game-card mb-3">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="w-9 h-9 rounded-full bg-purple-100 hover:bg-purple-200 text-purple-600 flex items-center justify-center text-lg font-bold"
              aria-label="뒤로"
            >
              ←
            </Link>
            <span className="text-3xl">{friend.avatar_emoji}</span>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-purple-700 text-lg">{friend.name}</div>
              <div className="text-xs text-purple-400">님과 이야기 나누기</div>
            </div>
            <div className="text-right text-xs text-purple-400">
              <div>나는</div>
              <div className="font-bold text-purple-600">
                {me.avatar_emoji} {me.name}
              </div>
            </div>
          </div>
        </div>

        {/* 메시지 목록 */}
        <div
          ref={listRef}
          className="game-card mb-3 overflow-y-auto"
          style={{ height: '55vh', minHeight: '320px' }}
        >
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-purple-300 text-sm">
              <div className="text-4xl mb-2">💌</div>
              아직 주고받은 이야기가 없어요.
              <br />첫 메시지를 남겨봐!
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {messages.map((m) => {
                const mine = m.from_player_id === me.id;
                return (
                  <div
                    key={m.id}
                    className={`flex ${mine ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className="max-w-[80%]">
                      <div
                        className={`px-3 py-2 rounded-2xl text-sm whitespace-pre-wrap break-words ${
                          mine
                            ? 'bg-purple-500 text-white rounded-br-sm'
                            : 'bg-purple-100 text-purple-800 rounded-bl-sm'
                        }`}
                      >
                        {m.content}
                      </div>
                      <div
                        className={`text-[10px] text-purple-300 mt-1 ${
                          mine ? 'text-right' : 'text-left'
                        }`}
                      >
                        {formatDate(m.created_at)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 입력 */}
        <div className="game-card">
          {error && <p className="text-red-400 text-xs mb-2 text-center">{error}</p>}
          <div className="flex gap-2">
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder={`${friend.name}에게 이야기를 남겨봐!`}
              maxLength={500}
              className="flex-1 px-4 py-3 rounded-xl border-2 border-purple-200 focus:border-purple-500 focus:outline-none text-sm"
            />
            <button
              onClick={handleSend}
              disabled={sending || !text.trim()}
              className="btn-primary px-5 disabled:opacity-50"
            >
              보내기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
