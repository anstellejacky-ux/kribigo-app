// ── SplashScreen ─────────────────────────────────────────────────────────────
import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import { COLORS } from '../../utils/theme';

export function SplashScreen({ navigation }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, friction: 6, useNativeDriver: true }),
    ]).start();
    const t = setTimeout(() => navigation.replace('Login', { mode: 'rider' }), 2200);
    return () => clearTimeout(t);
  }, []);

  return (
    <View style={s.container}>
      <Animated.View style={{ opacity, transform: [{ scale }], alignItems: 'center' }}>
        <Text style={s.logo}>Kribi<Text style={{ color: COLORS.accent }}>Go</Text></Text>
        <Text style={s.sub}>🇨🇲 Kribi, Cameroon</Text>
        <Text style={s.tagline}>Safe · Fast · Reliable</Text>
      </Animated.View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  logo: { fontSize: 70, fontWeight: '800', color: COLORS.white, letterSpacing: -2 },
  sub: { fontSize: 17, color: 'rgba(255,255,255,0.75)', marginTop: 8 },
  tagline: { fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: 6, letterSpacing: 1 },
});

export default SplashScreen;
