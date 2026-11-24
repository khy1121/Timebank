import { useEffect, useMemo, useState } from 'react';

import { openProofGroups } from '@/domain/groups';

import { useGroups } from './groups';
import { useTodos } from './todos';

/**
 * 지금 인증을 올릴 수 있는 내 상환. 상환 ID → 아직 안 올린 그룹 ID들 (FR-078)
 * 상환 직후 인증을 건너뛰었어도 24시간 안이면 상환 내역에서 다시 올릴 수 있다.
 */
export function useOpenProofs(): ReadonlyMap<string, string[]> {
  const { repayments } = useTodos();
  const { groups, posted } = useGroups();
  const [now, setNow] = useState(() => new Date());

  // 24시간이 지나면 버튼이 사라지도록 1분마다 시각을 새로 잡는다
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);

  return useMemo(() => {
    const ids = groups.map((g) => g.id);
    const open = new Map<string, string[]>();
    if (ids.length === 0) return open;
    for (const r of repayments) {
      const left = openProofGroups({ id: r.id, kind: r.kind, repaidAt: r.updatedAt }, ids, posted, now);
      if (left.length > 0) open.set(r.id, left);
    }
    return open;
  }, [repayments, groups, posted, now]);
}
