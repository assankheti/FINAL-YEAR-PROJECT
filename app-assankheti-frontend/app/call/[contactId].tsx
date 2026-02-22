import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import CallControls from '@/components/CallControls';
import { SafeAreaView } from 'react-native-safe-area-context';

type CallStatus = 'connecting' | 'ringing' | 'ongoing' | 'ended';

export default function PhoneCallPage() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const contactId = (params?.contactId as string) ?? 'contact';

  const { width } = useWindowDimensions();
  const horizontalPadding = Math.max(16, Math.round(width * 0.06));
  const contentMaxWidth = Math.min(width - horizontalPadding * 2, 520);

  const [callStatus, setCallStatus] = useState<CallStatus>('connecting');
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaker, setIsSpeaker] = useState(false);

  const contact = useMemo(
    () => ({
      id: contactId,
      name: 'Ahmad Ali',
      phone: '+92 300 1234567',
      type: 'Farmer',
      avatar: '👨‍🌾',
    }),
    [contactId]
  );

  useEffect(() => {
    const connectTimer = setTimeout(() => setCallStatus('ringing'), 1500);
    const answerTimer = setTimeout(() => setCallStatus('ongoing'), 4000);

    return () => {
      clearTimeout(connectTimer);
      clearTimeout(answerTimer);
    };
  }, []);

  useEffect(() => {
    if (callStatus !== 'ongoing') return;

    const interval = setInterval(() => setCallDuration((prev) => prev + 1), 1000);
    return () => clearInterval(interval);
  }, [callStatus]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const statusText = () => {
    switch (callStatus) {
      case 'connecting':
        return 'Connecting...';
      case 'ringing':
        return 'Ringing...';
      case 'ongoing':
        return formatDuration(callDuration);
      case 'ended':
        return 'Call Ended';
    }
  };

  const handleEndCall = () => {
    if (callStatus === 'ended') return;
    setCallStatus('ended');
    setTimeout(() => router.back(), 1000);
  };

  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (callStatus !== 'ringing') {
      pulse.stopAnimation();
      pulse.setValue(1);
      return;
    }

    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.06, duration: 550, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 550, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [callStatus, pulse]);

  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;
  const dot4 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (callStatus !== 'ringing') {
      dot1.stopAnimation();
      dot2.stopAnimation();
      dot3.stopAnimation();
      dot4.stopAnimation();
      dot1.setValue(0);
      dot2.setValue(0);
      dot3.setValue(0);
      dot4.setValue(0);
      return;
    }

    const make = (v: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(v, { toValue: 1, duration: 260, useNativeDriver: true }),
          Animated.timing(v, { toValue: 0, duration: 260, useNativeDriver: true }),
          Animated.delay(520),
        ])
      );

    const a1 = make(dot1, 0);
    const a2 = make(dot2, 150);
    const a3 = make(dot3, 300);
    const a4 = make(dot4, 450);

    a1.start();
    a2.start();
    a3.start();
    a4.start();

    return () => {
      a1.stop();
      a2.stop();
      a3.stop();
      a4.stop();
    };
  }, [callStatus, dot1, dot2, dot3, dot4]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0d5c4b' }}>
      <LinearGradient colors={['#0d5c4b', 'rgba(13,92,75,0.92)', 'rgba(13,92,75,0.82)']} style={{ flex: 1 }}>
        {/* Header */}
        <View style={{ paddingHorizontal: horizontalPadding, paddingTop: 12 }}>
          <View style={{ maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%' }}>
            <TouchableOpacity
              onPress={() => router.back()}
              activeOpacity={0.9}
              style={styles.backBtn}
              accessibilityRole="button"
              accessibilityLabel="Back"
            >
              <Feather name="arrow-left" size={18} color="#ffffff" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Contact */}
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: horizontalPadding }}>
          <View style={{ maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%', alignItems: 'center' }}>
          <Animated.View style={[styles.avatarRing, { transform: [{ scale: pulse }] }]}>
            <Text style={{ fontSize: 56 }}>{contact.avatar}</Text>
          </Animated.View>

          <Text style={styles.name}>{contact.name}</Text>
          <Text style={styles.role}>{contact.type}</Text>
          <Text style={styles.phone}>{contact.phone}</Text>

          <View style={styles.statusPill}>
            <Text style={[styles.statusText, callStatus === 'ongoing' ? styles.tabular : null]}>{statusText()}</Text>
          </View>

          {callStatus === 'ringing' ? (
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 18 }}>
              {[dot1, dot2, dot3, dot4].map((d, idx) => (
                <Animated.View
                  key={idx}
                  style={[
                    styles.ringDot,
                    {
                      transform: [
                        {
                          translateY: d.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0, -6],
                          }),
                        },
                      ],
                      opacity: d.interpolate({ inputRange: [0, 1], outputRange: [0.55, 0.95] }),
                    },
                  ]}
                />
              ))}
            </View>
          ) : null}
        </View>
        </View>

        {/* Controls */}
        <View style={{ paddingHorizontal: horizontalPadding, paddingBottom: 28 }}>
          <CallControls
            callStatus={callStatus}
            isMuted={isMuted}
            isSpeaker={isSpeaker}
            onToggleMute={() => setIsMuted((p) => !p)}
            onToggleSpeaker={() => setIsSpeaker((p) => !p)}
            onEndCall={handleEndCall}
          />
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  avatarRing: {
    width: 132,
    height: 132,
    borderRadius: 66,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },

  name: { fontSize: 22, fontWeight: '900', color: '#ffffff', textAlign: 'center' },
  role: { marginTop: 6, color: 'rgba(255,255,255,0.72)', fontWeight: '700' },
  phone: { marginTop: 6, color: 'rgba(255,255,255,0.62)', fontSize: 12, fontWeight: '600' },

  statusPill: { marginTop: 18, paddingHorizontal: 18, paddingVertical: 8, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.18)' },
  statusText: { color: '#ffffff', fontWeight: '800' },
  tabular: { fontVariant: ['tabular-nums'] },

  ringDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: 'rgba(255,255,255,0.72)' },

  ctrlBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctrlBtnDanger: { backgroundColor: '#ef4444' },
  ctrlBtnAccent: { backgroundColor: 'rgba(245,158,11,0.95)' },

  endBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  endHint: { marginTop: 12, color: 'rgba(255,255,255,0.62)', fontSize: 12, fontWeight: '600' },
});
