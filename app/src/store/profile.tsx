import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import {
  needsOnboarding,
  profileFromRow,
  profilePatchToRow,
  type Profile,
  type ProfileRow,
} from '@/domain/profile';
import { supabase } from '@/lib/supabase';

import { useAuth } from './auth';

/**
 * 사용자 설정 저장소: 알림 설정, 첫 실행 안내 여부, 유입 경로. (FR-032, FR-050, FR-054)
 * 기기에 사본을 두고 먼저 보여준 뒤 서버 값으로 맞춘다.
 * 바꿀 때는 화면에 먼저 반영하고 서버에는 뒤에서 올린다. 서버에 못 올리면 다음에 서버 값으로 되돌아간다.
 */

const storageKey = (userId: string) => `todo-interest/profile/${userId}`;
const COLUMNS = 'notify_enabled,notify_time,onboarded_at,signup_source,equipped';

type Store = {
  /** 아직 읽지 못했으면 null */
  profile: Profile | null;
  needsOnboarding: boolean;
  update: (patch: Partial<Profile>) => Promise<void>;
  /** 이 기기에 저장된 사본을 지운다. 로그아웃·계정 삭제 때 쓴다. */
  clearLocal: () => Promise<void>;
};

const ProfileContext = createContext<Store | null>(null);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const userId = session?.user.id ?? null;
  const [loaded, setLoaded] = useState<{ userId: string; profile: Profile } | null>(null);

  useEffect(() => {
    if (!userId) return;
    let active = true;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(storageKey(userId));
        // 상점이 생기기 전의 사본에는 equipped가 없다
        if (raw && active) {
          const cached = JSON.parse(raw) as Partial<Profile> & Omit<Profile, 'equipped'>;
          setLoaded({ userId, profile: { ...cached, equipped: cached.equipped ?? {} } });
        }
      } catch (e) {
        console.warn('설정 사본을 읽지 못했어요', e);
      }
      const { data, error } = await supabase.from('profiles').select(COLUMNS).eq('id', userId).maybeSingle();
      if (!active) return;
      if (error || !data) {
        if (error) console.warn('설정을 서버에서 받아 오지 못했어요', error);
        return;
      }
      const profile = profileFromRow(data as ProfileRow);
      setLoaded({ userId, profile });
      AsyncStorage.setItem(storageKey(userId), JSON.stringify(profile)).catch((e) => console.warn('설정을 저장하지 못했어요', e));
    })();
    return () => {
      active = false;
    };
  }, [userId]);

  // 다른 계정의 값이 잠깐이라도 보이지 않게, 지금 계정의 것일 때만 내보낸다
  const profile = loaded && loaded.userId === userId ? loaded.profile : null;

  const update = useCallback(
    async (patch: Partial<Profile>) => {
      if (!userId || !profile) return;
      const next = { ...profile, ...patch };
      setLoaded({ userId, profile: next });
      AsyncStorage.setItem(storageKey(userId), JSON.stringify(next)).catch((e) => console.warn('설정을 저장하지 못했어요', e));
      const { error } = await supabase.from('profiles').update(profilePatchToRow(patch)).eq('id', userId);
      if (error) console.warn('설정을 서버에 올리지 못했어요', error);
    },
    [userId, profile],
  );

  const clearLocal = useCallback(async () => {
    if (userId) await AsyncStorage.removeItem(storageKey(userId)).catch((e) => console.warn('지우지 못했어요', e));
  }, [userId]);

  const store = useMemo<Store>(
    () => ({ profile, needsOnboarding: needsOnboarding(profile), update, clearLocal }),
    [profile, update, clearLocal],
  );

  return <ProfileContext.Provider value={store}>{children}</ProfileContext.Provider>;
}

export function useProfile(): Store {
  const store = useContext(ProfileContext);
  if (!store) throw new Error('ProfileProvider 안에서만 쓸 수 있어요');
  return store;
}
