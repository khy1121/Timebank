import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { MyGroup } from '@/domain/groups';
import { color, radius, stroke, type } from '@/theme/tokens';

const AVATAR = require('@/assets/images/closet/base.png');

/** 그룹 목록의 한 줄 (TI-SCR-14). 피그마 GroupRow 50:1572 */
export function GroupRow({ group, onPress }: { group: MyGroup; onPress: () => void }) {
  const faces = Math.min(group.members, 3);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${group.name}. ${group.members}명${group.newProofs ? `. 새 인증 ${group.newProofs}개` : ''}`}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <View style={[styles.faces, { width: 36 + (faces - 1) * 14 }]}>
        {Array.from({ length: faces }, (_, i) => (
          <View key={i} style={[styles.face, { left: i * 14 }]}>
            <Image source={AVATAR} style={styles.faceImg} contentFit="cover" accessible={false} />
          </View>
        ))}
      </View>
      <View style={styles.text}>
        <Text style={[type.headline, styles.ink]} numberOfLines={1}>
          {group.name}
        </Text>
        <Text style={[type.caption, styles.muted]}>
          {group.members}명이 함께해요{group.isOwner ? '. 내가 방장' : ''}
        </Text>
      </View>
      {group.newProofs > 0 ? (
        <View style={styles.badge}>
          <Text style={[type.caption, styles.badgeText]}>새 인증 {group.newProofs}</Text>
        </View>
      ) : null}
      <Text style={[type.headline, styles.chevron]}>›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: radius.lg,
    borderWidth: stroke.outline,
    borderColor: color.inkOutline,
    backgroundColor: color.bgSurface,
  },
  pressed: { backgroundColor: color.bgSunken },
  faces: { height: 36 },
  face: {
    position: 'absolute',
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: color.mascotCream,
    borderWidth: 1.5,
    borderColor: color.inkOutline,
  },
  faceImg: { width: 36, height: 36 },
  text: { flex: 1, gap: 2 },
  ink: { color: color.textPrimary },
  muted: { color: color.textSecondary },
  badge: { backgroundColor: color.brandPrimary, borderRadius: radius.full, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { color: color.textOnPrimary },
  chevron: { color: color.textTertiary },
});
