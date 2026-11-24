import React, { useState } from 'react';
import { Image, StyleSheet, Text, View, ViewProps } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getBookCover, isUsableCoverUrl } from '../src/data/bookCovers';
import { useTheme } from '../src/theme/ThemeContext';

type BookCoverProps = ViewProps & {
  title: string;
  author: string;
  imageUrl?: string | null;
};

export function BookCover(props: BookCoverProps) {
  // A new record or uploaded URL resets failure state even in recycled list rows.
  return <CoverContent key={`${props.title}|${props.author}|${props.imageUrl}`} {...props} />;
}

function CoverContent({ title, author, imageUrl, children, style, ...props }: BookCoverProps) {
  const theme = useTheme();
  const [failedSource, setFailedSource] = useState(0);
  const bundled = getBookCover(title, author);
  const remote = isUsableCoverUrl(imageUrl) ? { uri: imageUrl.trim() } : undefined;
  // Replace fragile legacy seed links with the verified bundled edition immediately.
  const legacy = !!imageUrl && /amazon\.com|goodreads\.com|openlibrary\.org|shop\.martinwickramasinghe\.com/.test(imageUrl);
  const sources = legacy && bundled ? [bundled] : [remote, bundled].filter(Boolean);
  const source = sources[failedSource];

  return (
    <View {...props} style={[styles.container, { backgroundColor: theme.colors.surfaceMuted }, style]}>
      {source ? (
        <Image
          source={source}
          // Explicit 100% size: React Native Web gives bundled images their intrinsic pixel size, which would otherwise
          // override absoluteFill and crop the cover to its top-left corner
          style={[StyleSheet.absoluteFill, { width: '100%', height: '100%' }]}
          resizeMode="contain"
          accessibilityLabel={`Cover of ${title} by ${author}`}
          onError={() => setFailedSource((index) => index + 1)}
        />
      ) : (
        <View style={styles.fallback} accessibilityLabel={`Cover unavailable for ${title}`}>
          <Ionicons name="book-outline" size={32} color={theme.colors.textMuted} />
          <Text style={[styles.fallbackText, { color: theme.colors.textSecondary }]}>Cover unavailable</Text>
        </View>
      )}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { overflow: 'hidden' },
  fallback: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', padding: 12 },
  fallbackText: { fontSize: 12, textAlign: 'center', marginTop: 8 },
});
