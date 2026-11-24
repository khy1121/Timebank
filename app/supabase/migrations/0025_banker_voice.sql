-- 은행원 말투 (FR-111, 동네 창구 혜택). 말투 값에 banker를 더한다
alter table public.profiles drop constraint profiles_voice_check;
alter table public.profiles add constraint profiles_voice_check check (voice in ('spicy', 'mild', 'banker'));
