import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, ViewStyle } from 'react-native';

type Props = {
  /** When true the dots animate and the component is visible. */
  visible: boolean;
  style?: ViewStyle;
};

const DOT_COLOR = '#0d5c4b';
const DOT_SIZE = 8;
const DOT_GAP = 6;

// Stagger each dot's animation by this amount (ms).
const STAGGER_MS = 160;
// Each bounce cycle duration (ms).
const CYCLE_MS = 600;
// Amount the dots travel upward (negative = up).
const TRAVEL = -6;

/**
 * Animated three-dot bounce indicator to show that the remote participant
 * is typing.
 *
 * The component renders nothing (height: 0) when `visible` is false so it
 * does not affect layout.  The bounce animation starts fresh every time
 * `visible` transitions to true and stops cleanly when it transitions to
 * false.
 */
export default function TypingIndicator({ visible, style }: Props) {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;
  const animRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (!visible) {
      // Stop the animation and reset dots to their resting position.
      animRef.current?.stop();
      animRef.current = null;
      dot1.setValue(0);
      dot2.setValue(0);
      dot3.setValue(0);
      return;
    }

    const makeBounce = (value: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(value, {
            toValue: 1,
            duration: CYCLE_MS / 2,
            useNativeDriver: true,
          }),
          Animated.timing(value, {
            toValue: 0,
            duration: CYCLE_MS / 2,
            useNativeDriver: true,
          }),
        ])
      );

    const anim = Animated.parallel([
      makeBounce(dot1, 0),
      makeBounce(dot2, STAGGER_MS),
      makeBounce(dot3, STAGGER_MS * 2),
    ]);

    animRef.current = anim;
    anim.start();

    return () => {
      anim.stop();
    };
  }, [visible, dot1, dot2, dot3]);

  if (!visible) {
    return null;
  }

  const makeTranslate = (value: Animated.Value) =>
    value.interpolate({
      inputRange: [0, 1],
      outputRange: [0, TRAVEL],
    });

  return (
    <View style={[styles.container, style]} accessibilityLabel="Typing indicator">
      {([dot1, dot2, dot3] as Animated.Value[]).map((val, i) => (
        <Animated.View
          key={i}
          style={[
            styles.dot,
            {
              transform: [{ translateY: makeTranslate(val) }],
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: DOT_GAP,
  },
  dot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    backgroundColor: DOT_COLOR,
    opacity: 0.75,
  },
});
