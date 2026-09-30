import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';
import { tabularNums } from '@/theme/typography';
import { StyleSheet, View } from 'react-native';
import { AppText, type TextTone } from './AppText';

type StatTileProps = {
  label: string;
  value: string;
  tone?: TextTone;
  /** The value in `statMedium` rather than `headline` (the Profile's stats). */
  large?: boolean;
  /** On the value. */
  testID?: string;
};

/** A labeled number inside a card (BEST FG%, SESSIONS…). Tiles in a row share its width. */
export function StatTile({ label, value, tone = 'default', large = false, testID }: StatTileProps) {
  return (
    <View style={styles.tile}>
      <AppText variant="label" tone="secondary">
        {label}
      </AppText>
      <AppText
        testID={testID}
        variant={large ? 'statMedium' : 'headline'}
        // A long value (1234 / 2890) shrinks to fit rather than wrapping.
        numberOfLines={1}
        adjustsFontSizeToFit
        tone={tone}
        style={tabularNums}
      >
        {value}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    gap: spacing.xxs,
    padding: spacing.md,
    borderRadius: radius.input,
    backgroundColor: colors.surfaceRaised,
  },
});
