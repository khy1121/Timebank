import { useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SpeechBubble } from '@/components/SpeechBubble';
import { TODO_GONE } from '@/domain/messages';
import { TodoForm } from '@/components/TodoForm';
import { TopBar } from '@/components/TopBar';
import { useTodos } from '@/store/todos';
import * as layout from '@/theme/layout';
import { themed } from '@/theme/tokens';
import { goBack } from '@/lib/navigation';

/** TI-SCR-04 할 일 입력 (수정) */
export default function EditTodoScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { todos } = useTodos();
  const todo = todos.find((t) => t.id === id && t.status === 'open');

  if (!todo) {
    return (
      <SafeAreaView style={styles.safe}>
        <TopBar onLead={goBack} />
        <View style={styles.body}>
          <SpeechBubble text={TODO_GONE} />
        </View>
      </SafeAreaView>
    );
  }
  return <TodoForm original={todo} />;
}

const styles = themed(() => ({
  safe: layout.screen,
  body: { padding: 24 },
}));
