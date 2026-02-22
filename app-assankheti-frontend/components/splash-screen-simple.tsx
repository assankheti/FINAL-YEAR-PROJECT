// =========================
// IMPORTS
// =========================

// Gradient background support (React Native has no CSS gradients)
import { LinearGradient } from 'expo-linear-gradient';

// React hooks for state, lifecycle, and persistent values
import { useEffect, useRef, useState } from 'react';

// Core React Native components + animation system
import {
  Animated,                // For smooth, native-like animations
  Easing,                  // For professional easing curves
  Image,                   // To render images
  StyleSheet,              // Optimized styling system
  Text,                    // Text rendering
  View,                    // Layout container
  useWindowDimensions,     // For responsive screen sizing
} from 'react-native';

// Ensures UI does not overlap with notches / status bars
import { SafeAreaView } from 'react-native-safe-area-context';

// =========================
// SPLASH SCREEN COMPONENT
// =========================

export function SplashScreen({ onComplete }: { onComplete?: () => void }) {

  // -------------------------
  // STATE & RESPONSIVE VALUES
  // -------------------------

  // Loading progress state (0 → 100)
  const [progress, setProgress] = useState(0);

  // Get current device width
  const { width } = useWindowDimensions();

  // Responsive horizontal padding (minimum 16px)
  const horizontalPadding = Math.max(16, Math.round(width * 0.06));

  // Responsive logo size (70% of width, max 200px)
  const logoSize = Math.min(Math.round(width * 0.7), 200);

  // -------------------------
  // ANIMATED VALUES (PERSIST)
  // -------------------------

  // Rotation animation value for logo
  const rotateAnim = useRef(new Animated.Value(0)).current;

  // Scale animation for logo entrance
  const logoScale = useRef(new Animated.Value(0.85)).current;

  // Floating Y-axis animation
  const floatY = useRef(new Animated.Value(0)).current;

  // Glow pulsing scale
  const glowScale = useRef(new Animated.Value(1)).current;

  // Opacity animation for title
  const titleOpacity = useRef(new Animated.Value(0)).current;

  // Vertical slide animation for title
  const titleTranslateY = useRef(new Animated.Value(10)).current;

  // Opacity animation for tagline
  const taglineOpacity = useRef(new Animated.Value(0)).current;

  // Underline width animation
  const underline = useRef(new Animated.Value(0)).current;

  // Progress bar animation value
  const progressAnim = useRef(new Animated.Value(0)).current;

  // Fade-out animation for entire screen (exit animation)
  const screenFade = useRef(new Animated.Value(1)).current;

  // Make LinearGradient compatible with Animated API
  const AnimatedLinearGradient =
    Animated.createAnimatedComponent(LinearGradient);

  // -------------------------
  // EFFECT: START ANIMATIONS
  // -------------------------

  useEffect(() => {

    // LOGO ENTRANCE: rotate + scale in
    Animated.parallel([
      Animated.spring(rotateAnim, {
        toValue: 1,
        friction: 6,
        tension: 70,
        useNativeDriver: true,
      }),
      Animated.spring(logoScale, {
        toValue: 1,
        friction: 7,
        tension: 60,
        useNativeDriver: true,
      }),
    ]).start();

    // TITLE FADE + SLIDE UP
    Animated.timing(titleOpacity, {
      toValue: 1,
      duration: 700,
      delay: 350,
      useNativeDriver: true,
    }).start();

    Animated.timing(titleTranslateY, {
      toValue: 0,
      duration: 700,
      delay: 350,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();

    // UNDERLINE DRAW ANIMATION
    Animated.timing(underline, {
      toValue: 100,
      duration: 600,
      delay: 700,
      useNativeDriver: false, // width cannot use native driver
    }).start();

    // TAGLINE FADE IN
    Animated.timing(taglineOpacity, {
      toValue: 1,
      duration: 500,
      delay: 900,
      useNativeDriver: true,
    }).start();

    // FLOATING LOGO LOOP
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatY, {
          toValue: -6,
          duration: 2000,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(floatY, {
          toValue: 0,
          duration: 2000,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // GLOW PULSE LOOP
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowScale, {
          toValue: 1.25,
          duration: 2200,
          useNativeDriver: true,
        }),
        Animated.timing(glowScale, {
          toValue: 1,
          duration: 2200,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // FAKE LOADING PROGRESS
    const interval = setInterval(() => {
      setProgress((prev) => {
        const next = Math.min(100, prev + 1.5);

        // Animate progress bar width
        Animated.timing(progressAnim, {
          toValue: next,
          duration: 200,
          useNativeDriver: false,
        }).start();

        // EXIT ANIMATION + NAVIGATION
        if (next >= 100) {
          clearInterval(interval);
           Animated.timing(screenFade, {
            toValue: 0,
            duration: 400,
            delay: 300,
            useNativeDriver: true,
          }).start(() => onComplete?.());
        }

        return next;
      });
    }, 30);

    // Cleanup interval when component unmounts
    return () => clearInterval(interval);
  }, []);

  // -------------------------
  // INTERPOLATIONS
  // -------------------------

  // Convert rotation value into degrees
  const rotateInterpolate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['-180deg', '0deg'],
  });

  // Convert underline value into width %
  const underlineWidth = underline.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  // Convert progress value into width %
  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  // =========================
  // RENDER UI
  // =========================

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <Animated.View style={{ flex: 1, opacity: screenFade }}>
        <LinearGradient
          colors={['#f5f1e8', '#e8f5e9', '#fff8e1']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.container, { paddingHorizontal: horizontalPadding }]}
        >

          {/* CENTER CONTENT */}
          <View style={styles.centerContent}>

            {/* LOGO WITH ANIMATIONS */}
            <Animated.View
              style={[
                styles.logoWrap,
                {
                  transform: [
                    { rotate: rotateInterpolate },
                    { scale: logoScale },
                    { translateY: floatY },
                  ],
                },
              ]}
            >
              {/* GLOW CIRCLE */}
              <Animated.View
                style={[
                  styles.glowCircle,
                  {
                    width: logoSize,
                    height: logoSize,
                    borderRadius: logoSize / 2,
                    transform: [{ scale: glowScale }],
                  },
                ]}
              />

              {/* LOGO IMAGE (TRANSPARENT) */}
              <Image
                source={require('../assets/images/logo-removebg.png')}
                style={{ width: logoSize, height: logoSize }}
                resizeMode="contain"
              />
            </Animated.View>

            {/* TITLE */}
            <Animated.View
              style={{
                opacity: titleOpacity,
                transform: [{ translateY: titleTranslateY }],
                alignItems: 'center',
              }}
            >
              <Text style={styles.title}>ASSAN KHETI</Text>
              <Animated.View
                style={[styles.underline, { width: underlineWidth }]}
              />
            </Animated.View>

            {/* TAGLINE */}
            <Animated.Text
              style={[styles.tagline, { opacity: taglineOpacity }]}
            >
              Smart Agriculture Assistant for Farmers
            </Animated.Text>
          </View>

          {/* LOADING SECTION */}
          <View style={[styles.loadingContainer, styles.loadingFixedBottom]}>
            <Text style={styles.loadingText}>
              Loading... {Math.round(progress)}%
            </Text>

            <View style={styles.progressBarContainer}>
              <Animated.View style={{ width: progressWidth, height: '100%' }}>
                <AnimatedLinearGradient
                  colors={['#0d5c4b', '#10b981', '#f59e0b']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{ flex: 1 }}
                />
              </Animated.View>
            </View>

            <Text style={styles.version}>Version 1.0.0</Text>
          </View>

        </LinearGradient>
      </Animated.View>
    </SafeAreaView>
  );
}

// =========================
// STYLES
// =========================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  centerContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  logoWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },

  glowCircle: {
    position: 'absolute',
    backgroundColor: 'rgba(13, 92, 75, 0.18)',
  },

  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0d5c4b',
    marginTop: 8,
  },

  underline: {
    height: 4,
    backgroundColor: '#10b981',
    borderRadius: 2,
    marginTop: 8,
  },

  tagline: {
    fontSize: 16,
    color: '#777',
    marginTop: 6,
  },

  loadingContainer: {
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
  },

  loadingFixedBottom: {
    position: 'absolute',
    bottom: 28,
  },

  loadingText: {
    color: '#999',
    marginBottom: 8,
  },

  progressBarContainer: {
    width: '100%',
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderRadius: 4,
    overflow: 'hidden',
  },

  version: {
    fontSize: 12,
    color: '#bbb',
    marginTop: 6,
  },
});
