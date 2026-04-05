// 레벨 시스템 유틸리티
// 레벨이 올라갈수록 레벨업에 필요한 승수가 증가

// 해당 레벨에서 다음 레벨까지 필요한 승수
export function winsForLevel(level: number): number {
  return 3 + Math.floor(level / 10);
}

// 총 승수로부터 현재 레벨 정보 계산
export function computeLevel(totalWins: number): {
  level: number;
  winsInLevel: number;
  winsForNext: number;
} {
  let level = 1;
  let remaining = totalWins;
  while (level < 99) {
    const required = winsForLevel(level);
    if (remaining < required) break;
    remaining -= required;
    level++;
  }
  return {
    level,
    winsInLevel: remaining,
    winsForNext: winsForLevel(level),
  };
}

// 10레벨 단위 마일스톤 칭호
export const MILESTONES: Record<number, { title: string; badge: string; reward: string }> = {
  10: { title: '스도쿠 새싹', badge: '🌱', reward: '힌트 +1 (총 4개)' },
  20: { title: '스도쿠 도전자', badge: '⭐', reward: '힌트 +1 (총 5개)' },
  30: { title: '스도쿠 실력자', badge: '💫', reward: '힌트 +1 (총 6개)' },
  40: { title: '스도쿠 고수', badge: '🔥', reward: '실수 허용 +1 (총 8개)' },
  50: { title: '스도쿠 달인', badge: '💎', reward: '힌트 +1 (총 7개)' },
  60: { title: '스도쿠 왕', badge: '👑', reward: '실수 허용 +1 (총 9개)' },
  70: { title: '스도쿠 챔피언', badge: '🏆', reward: '힌트 +1 (총 8개)' },
  80: { title: '스도쿠 전설', badge: '🐉', reward: '실수 허용 +1 (총 10개)' },
  90: { title: '스도쿠 신', badge: '✨', reward: '최종 칭호 달성!' },
};

// 현재 레벨의 최고 마일스톤 칭호 가져오기
export function getCurrentMilestone(level: number): { title: string; badge: string } | null {
  let best: { title: string; badge: string } | null = null;
  for (const [milestone, info] of Object.entries(MILESTONES)) {
    if (level >= Number(milestone)) {
      best = { title: info.title, badge: info.badge };
    }
  }
  return best;
}

// 레벨 기반 보너스 힌트 수
export function getBonusHints(level: number): number {
  let bonus = 0;
  if (level >= 10) bonus++;
  if (level >= 20) bonus++;
  if (level >= 30) bonus++;
  if (level >= 50) bonus++;
  if (level >= 70) bonus++;
  return bonus;
}

// 레벨 기반 보너스 실수 허용 수
export function getBonusMistakes(level: number): number {
  let bonus = 0;
  if (level >= 40) bonus++;
  if (level >= 60) bonus++;
  if (level >= 80) bonus++;
  return bonus;
}
