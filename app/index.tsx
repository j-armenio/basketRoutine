import { db } from '@/db/client';
import { listExercises } from '@/db/repositories/exercises';
import { createRoutine, listRoutines } from '@/db/repositories/routines';
import { colors } from '@/theme/colors';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Temporary DB check, replaced by the real shell in Phase 2.
export default function Index() {
  const [routineCount, setRoutineCount] = useState(() => listRoutines(db).length);
  const exerciseCount = listExercises(db).length;

  const addTestRoutine = () => {
    createRoutine(db, `Test routine ${routineCount + 1}`);
    setRoutineCount(listRoutines(db).length);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.text}>Basket Routine</Text>
        <Text style={styles.detail}>Catalog: {exerciseCount} exercises</Text>
        <Text style={styles.detail}>Routines: {routineCount}</Text>
        <Pressable style={styles.button} onPress={addTestRoutine}>
          <Text style={styles.buttonText}>Add test routine</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  text: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '600',
  },
  detail: {
    color: colors.text,
    fontSize: 16,
  },
  button: {
    marginTop: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.text,
  },
  buttonText: {
    color: colors.text,
    fontSize: 16,
  },
});
