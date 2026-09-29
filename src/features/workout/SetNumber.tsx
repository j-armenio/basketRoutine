import { AppText } from '@/components/AppText';
import { tabularNums } from '@/theme/typography';
import { View } from 'react-native';
import { setTable } from './setTable';

/** A set's 1-based number, in the table's SET column. */
export function SetNumber({ number }: { number: number }) {
  return (
    <View style={setTable.numberColumn}>
      <AppText weight="bold" tone="secondary" style={tabularNums}>
        {number}
      </AppText>
    </View>
  );
}
