import { AppText } from '@/components/AppText';
import { Icon } from '@/components/Icon';
import { colors } from '@/theme/colors';
import { opacity, radius, size, spacing } from '@/theme/spacing';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, View } from 'react-native';
import { exerciseCount, type CategoryCardData } from './catalogList';
import { CATEGORY_IMAGES } from './categoryImages';

type CategoryCardProps = {
  card: CategoryCardData;
  onPress: () => void;
};

/**
 * A category on the Exercises tab: its image covering the card (or the placeholder ball until
 * there is one), its name and how many exercises it opens at the bottom, on a dark band so the
 * text stays readable on any image.
 */
export function CategoryCard({ card, onPress }: CategoryCardProps) {
  const image = CATEGORY_IMAGES[card.key];
  const count = exerciseCount(card.count);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${card.label}, ${count}`}
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      {image ? (
        <Image
          testID="category-image"
          source={image.source}
          contentFit="cover"
          style={StyleSheet.absoluteFill}
        />
      ) : (
        <View
          testID="category-placeholder"
          importantForAccessibility="no-hide-descendants"
          style={styles.placeholder}
        >
          <Icon name="sports_basketball" size={size.iconLarge} color={colors.iconPlaceholder} />
        </View>
      )}
      <View style={[styles.caption, image && styles.band]}>
        <AppText variant="sectionTitle" numberOfLines={1}>
          {card.label}
        </AppText>
        <AppText variant="caption">{count}</AppText>
      </View>
    </Pressable>
  );
}

/** The cards two per row; an odd last one keeps half the width. */
export function CategoryGrid({
  cards,
  onPressCard,
}: {
  cards: CategoryCardData[];
  onPressCard: (card: CategoryCardData) => void;
}) {
  const rows: CategoryCardData[][] = [];
  for (let i = 0; i < cards.length; i += 2) rows.push(cards.slice(i, i + 2));
  return (
    <View style={styles.grid}>
      {rows.map((row) => (
        <View key={row[0].key} style={styles.row}>
          {row.map((card) => (
            <View key={card.key} style={styles.cell}>
              <CategoryCard card={card} onPress={() => onPressCard(card)} />
            </View>
          ))}
          {row.length === 1 && <View style={styles.cell} />}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    gap: spacing.itemGap,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.itemGap,
  },
  cell: {
    flex: 1,
  },
  card: {
    height: size.categoryCard,
    justifyContent: 'flex-end',
    overflow: 'hidden',
    borderRadius: radius.card,
    backgroundColor: colors.surface,
  },
  pressed: {
    opacity: opacity.pressed,
  },
  placeholder: {
    position: 'absolute',
    top: spacing.lg,
    right: spacing.lg,
  },
  caption: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  band: {
    backgroundColor: colors.scrim,
  },
});
