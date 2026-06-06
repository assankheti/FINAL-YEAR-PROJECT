import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, StyleProp, StyleSheet, ViewStyle } from 'react-native';

export function SpeechHighlight({
  active,
  children,
  style,
  highlightStyle,
  fill,
}: {
  active: boolean;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  highlightStyle?: StyleProp<ViewStyle>;
  /** Make the wrapper (and inner content holder) flex:1 so a flex child like a
   *  ScrollView keeps its height. Use when wrapping a fill area, not a card. */
  fill?: boolean;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const borderOpacity = useRef(new Animated.Value(active ? 1 : 0)).current;

  useEffect(() => {
    if (active) {
      Animated.parallel([
        Animated.timing(scale, { toValue: 1.02, duration: 160, useNativeDriver: true }),
        Animated.timing(borderOpacity, { toValue: 1, duration: 160, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(scale, { toValue: 1, duration: 160, useNativeDriver: true }),
        Animated.timing(borderOpacity, { toValue: 0, duration: 160, useNativeDriver: true }),
      ]).start();
    }
  }, [active, borderOpacity, scale]);

  const resolvedHighlightStyle = useMemo(
    () => [
      styles.highlight,
      highlightStyle,
      {
        opacity: borderOpacity,
        transform: [{ scale }],
      },
    ],
    [borderOpacity, highlightStyle, scale]
  );

  return (
    <Animated.View style={[styles.wrapper, fill && styles.fill, style]}>
      <Animated.View style={[{ transform: [{ scale }], zIndex: 1 }, fill && styles.fill]}>{children}</Animated.View>
      <Animated.View pointerEvents="none" style={[resolvedHighlightStyle, { zIndex: 2 }]} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
    overflow: 'visible',
  },
  fill: {
    flex: 1,
  },
  highlight: {
    position: 'absolute',
    top: -4,
    left: -4,
    right: -4,
    bottom: -4,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#10b981',
  },
});
