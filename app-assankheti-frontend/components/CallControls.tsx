import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useT } from '@/contexts/LanguageContext';

export type CallStatus = 'connecting' | 'ringing' | 'ongoing' | 'ended';

export default function CallControls({
  callStatus,
  isMuted,
  isSpeaker,
  onToggleMute,
  onToggleSpeaker,
  onEndCall,
}: {
  callStatus: CallStatus;
  isMuted: boolean;
  isSpeaker: boolean;
  onToggleMute: () => void;
  onToggleSpeaker: () => void;
  onEndCall: () => void;
}) {
  const t = useT();

  return (
    <View>
      {callStatus === 'ongoing' ? (
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 18, marginBottom: 18 }}>
          <TouchableOpacity
            onPress={onToggleMute}
            activeOpacity={0.9}
            style={[styles.ctrlBtn, isMuted ? styles.ctrlBtnDanger : null]}
            accessibilityRole="button"
            accessibilityLabel={t({ english: 'Mute', urdu: 'خاموش' })}
          >
            <Feather name={isMuted ? 'mic-off' : 'mic'} size={22} color="#ffffff" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={onToggleSpeaker}
            activeOpacity={0.9}
            style={[styles.ctrlBtn, isSpeaker ? styles.ctrlBtnAccent : null]}
            accessibilityRole="button"
            accessibilityLabel={t({ english: 'Speaker', urdu: 'اسپیکر' })}
          >
            <Feather name={isSpeaker ? 'volume-2' : 'volume-x'} size={22} color="#ffffff" />
          </TouchableOpacity>
        </View>
      ) : null}

      <View style={{ alignItems: 'center' }}>
        <TouchableOpacity
          onPress={onEndCall}
          disabled={callStatus === 'ended'}
          activeOpacity={0.9}
          style={[styles.endBtn, callStatus === 'ended' ? { opacity: 0.5 } : null]}
          accessibilityRole="button"
          accessibilityLabel={t({ english: 'End Call', urdu: 'کال ختم کریں' })}
        >
          <Feather name="phone-off" size={26} color="#ffffff" />
        </TouchableOpacity>

        <Text style={styles.endHint}>{callStatus === 'ongoing' ? t({ english: 'Tap to end call', urdu: 'کال ختم کرنے کے لیے چھوئیں' }) : ''}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
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
