import * as Linking from 'expo-linking';
import * as Sharing from 'expo-sharing';
import { useRef, useState, type ComponentRef } from 'react';
import { Platform, ScrollView, Share, Text, View, useWindowDimensions } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { ShareCard } from '@/components/ShareCard';
import { TopBar } from '@/components/TopBar';
import { friendShareMessage } from '@/domain/friends';
import { track } from '@/lib/events';
import { goBack } from '@/lib/navigation';
import { useFriends } from '@/store/friends';
import * as layout from '@/theme/layout';
import { color, themed, type } from '@/theme/tokens';

/**
 * 친구 코드 공유 카드 (FR-104, 피그마 155:3654). 카드를 그림으로 찍어 인스타그램 스토리 등에 올린다.
 * 웹에서는 그림을 찍을 수 없어 코드 글을 보낸다.
 */
export default function ShareCardScreen() {
  const { me } = useFriends();
  const { width } = useWindowDimensions();
  const cardWidth = Math.min(width - 64, 300);
  const ref = useRef<ComponentRef<typeof View>>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const share = async () => {
    if (!me) return;
    const link = Linking.createURL('friends', { queryParams: { code: me.code } });
    setBusy(true);
    try {
      if (Platform.OS !== 'web' && (await Sharing.isAvailableAsync())) {
        const uri = await captureRef(ref as unknown as Parameters<typeof captureRef>[0], { format: 'png', quality: 1, result: 'tmpfile' });
        await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: '친구 코드 공유' });
        track('friend_card_share', { image: true });
      } else {
        await Share.share({ message: friendShareMessage(me.code, link) });
        track('friend_card_share', { image: false });
      }
    } catch (e) {
      console.warn('공유하지 못했어요', e);
      setNote('공유하지 못했어요. 잠시 뒤 다시 해 주세요.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <TopBar title="코드 카드" onLead={goBack} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[type.body, styles.secondary]}>이 카드를 인스타그램 스토리나 메신저에 올리면 친구가 코드를 넣고 신청할 수 있어요.</Text>
        <View style={styles.center}>{me ? <ShareCard ref={ref} code={me.code} width={cardWidth} /> : <Text style={[type.caption, styles.secondary]}>불러오는 중이에요</Text>}</View>
        {note ? <Text style={[type.label, styles.bad]}>{note}</Text> : null}
        <Button label={busy ? '만드는 중…' : Platform.OS === 'web' ? '코드 글 보내기' : '이미지로 공유하기'} onPress={share} disabled={!me || busy} />
        {Platform.OS === 'web' ? <Text style={[type.caption, styles.muted]}>웹에서는 그림 대신 코드 글을 보내요. 휴대폰 앱에서는 이미지로 공유돼요.</Text> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = themed(() => ({
  safe: layout.screen,
  content: layout.content,
  center: { alignItems: 'center' },
  secondary: { color: color.textSecondary },
  muted: { color: color.textTertiary },
  bad: { color: color.debtFg },
}));
