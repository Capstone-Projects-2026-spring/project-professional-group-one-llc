import { Text, View, TouchableOpacity } from 'react-native';
import styles from '../styles/appStyles';

export default function CategoryTabs({
  categories,
  activeCategory,
  categoryColors,
  onSelectCategory,
}) {
  return (
    <View style={styles.categoryBar}>
      {Object.keys(categories).map((category) => (
        <TouchableOpacity
          key={category}
          style={[
            styles.categoryTab,
            activeCategory === category && {
              backgroundColor: categoryColors[category] || '#6C63FF',
            },
          ]}
          onPress={() => onSelectCategory(category)}
        >
          <Text
            style={[
              styles.categoryTabText,
              activeCategory === category && styles.categoryTabTextActive,
            ]}
          >
            {category}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}
