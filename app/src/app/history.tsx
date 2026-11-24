import { router } from 'expo-router';
import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { HistoryList } from '@/components/HistoryList';
import { TopBar } from '@/components/TopBar';
import { useOpenProofs } from '@/store/openProofs';
import { useTodos } from '@/store/todos';
import * as layout from '@/theme/layout';
import { themed } from '@/theme/tokens';
import { goBack } from '@/lib/navigation';

/** TI-SCR-06 상환 내역 (FR-016, FR-024) */
export default function HistoryScreen() {
  const { repayments, today, settlementFor } = useTodos();
  const openProofs = useOpenProofs();
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <TopBar title="상환 내역" onLead={goBack} />
      <ScrollView contentContainerStyle={styles.content}>
        <HistoryList
          repayments={repayments}
          today={today}
          settlementFor={settlementFor}
          canProof={(id) => openProofs.has(id)}
          onProof={(repaymentId) => router.push({ pathname: '/proof', params: { repaymentId } })}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = themed(() => ({
  safe: layout.screen,
  content: layout.content,
}));
