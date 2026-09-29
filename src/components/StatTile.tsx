import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';
import { tabularNums } from '@/theme/typography';
import { StyleSheet, View } from 'react-native';
import { AppText, type TextTone } from './AppText';

type StatTileProps = {
  label: string;
  value: string;
  tone?: TextTone;
};

/** A labeled number inside a card (BEST FG%, SESSIONS…). Tiles in a row share its width. */
export function StatTile({ label, value, tone = 'default' }: StatTileProps) {
  return (
    <View style={styles.tile}>
      <AppText variant="label" tone="secondary">
        {label}
      </AppText>
      <AppText variant="headline" tone={tone} style={tabularNums}>
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
