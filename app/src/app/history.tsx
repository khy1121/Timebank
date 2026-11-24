import { router } from 'expo-router';
import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { HistoryList } from '@/components/HistoryList';
import { TopBar } from '@/components/TopBar';
import { useOpenProofs } from '@/store/openProofs';
import { useTodos } from '@/store/todos';
import * as layout from '@/theme/layout';

/** TI-SCR-06 상환 내역 (FR-016, FR-024) */
export default function HistoryScreen() {
  const { repayments, today } = useTodos();
  const openProofs = useOpenProofs();
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <TopBar title="상환 내역" onLead={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content}>
        <HistoryList
          repayments={repayments}
          today={today}
          canProof={(id) => openProofs.has(id)}
          onProof={(repaymentId) => router.push({ pathname: '/proof', params: { repaymentId } })}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: layout.screen,
  content: layout.content,
});
