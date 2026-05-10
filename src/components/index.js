import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, TextInput, StyleSheet } from 'react-native';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../utils/theme';

export function Btn({ title, onPress, variant = 'primary', loading, disabled, style }) {
  const bg = {
    primary: COLORS.primary, secondary: COLORS.primaryLight,
    danger: COLORS.dangerLight, ghost: COLORS.background, accent: COLORS.accent,
  }[variant] || COLORS.primary;
  const color = {
    primary: COLORS.white, secondary: COLORS.primary,
    danger: COLORS.danger, ghost: COLORS.textSecondary, accent: COLORS.textPrimary,
  }[variant] || COLORS.white;
  return (
    <TouchableOpacity onPress={onPress} disabled={disabled || loading} activeOpacity={0.8}
      style={[{ backgroundColor: disabled ? COLORS.borderMed : bg, borderRadius: RADIUS.md, paddingVertical: 14, paddingHorizontal: SPACING.xl, alignItems: 'center', justifyContent: 'center', ...SHADOWS.sm }, style]}>
      {loading ? <ActivityIndicator color={color} size="small" /> :
        <Text style={{ color: disabled ? COLORS.white : color, fontSize: FONTS.sizes.md, fontWeight: '700' }}>{title}</Text>}
    </TouchableOpacity>
  );
}

export function Card({ children, style, pad = true }) {
  return (
    <View style={[{ backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border, padding: pad ? SPACING.lg : 0, ...SHADOWS.sm }, style]}>
      {children}
    </View>
  );
}

export function Avatar({ name, size = 44, color = COLORS.primary }) {
  const initials = name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: COLORS.white, fontSize: size * 0.35, fontWeight: '700' }}>{initials}</Text>
    </View>
  );
}

export function Badge({ label, variant = 'green', style }) {
  const v = { green: [COLORS.primaryLight, COLORS.primaryDark], amber: [COLORS.accentLight, '#7A5200'], gray: [COLORS.border, COLORS.textSecondary], blue: [COLORS.infoLight, COLORS.info] }[variant] || [COLORS.primaryLight, COLORS.primaryDark];
  return (
    <View style={[{ backgroundColor: v[0], borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 3 }, style]}>
      <Text style={{ color: v[1], fontSize: FONTS.sizes.xs, fontWeight: '700' }}>{label}</Text>
    </View>
  );
}

export function Stars({ rating, onRate, size = 30 }) {
  return (
    <View style={{ flexDirection: 'row', gap: 6, justifyContent: 'center' }}>
      {[1,2,3,4,5].map(s => (
        <TouchableOpacity key={s} onPress={() => onRate?.(s)} activeOpacity={0.7}>
          <Text style={{ fontSize: size, color: s <= rating ? COLORS.accent : COLORS.border }}>★</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

export function Divider({ style }) {
  return <View style={[{ height: 1, backgroundColor: COLORS.border, marginVertical: SPACING.md }, style]} />;
}

export function PhoneInput({ value, onChangeText, placeholder }) {
  return (
    <View style={{ flexDirection: 'row', backgroundColor: COLORS.background, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden' }}>
      <View style={{ padding: 14, borderRightWidth: 1, borderRightColor: COLORS.border, backgroundColor: COLORS.border, justifyContent: 'center' }}>
        <Text style={{ fontSize: 22 }}>🇨🇲</Text>
      </View>
      <TextInput
        style={{ flex: 1, padding: 14, fontSize: FONTS.sizes.md, color: COLORS.textPrimary }}
        value={value} onChangeText={onChangeText}
        keyboardType="phone-pad" placeholder={placeholder}
        placeholderTextColor={COLORS.textPlaceholder}
      />
    </View>
  );
}

export function OTPInput({ otp, onChange }) {
  const refs = Array.from({ length: 6 }, () => React.createRef());
  const handle = (text, i) => {
    const next = [...otp]; next[i] = text.slice(-1); onChange(next);
    if (text && i < 5) refs[i + 1].current?.focus();
    if (!text && i > 0) refs[i - 1].current?.focus();
  };
  return (
    <View style={{ flexDirection: 'row', gap: 10, justifyContent: 'center' }}>
      {otp.map((d, i) => (
        <TextInput key={i} ref={refs[i]}
          style={{ width: 46, height: 54, borderRadius: RADIUS.md, borderWidth: 1.5, borderColor: d ? COLORS.primary : COLORS.border, backgroundColor: d ? COLORS.primaryLight : COLORS.background, fontSize: FONTS.sizes.xl, fontWeight: '700', color: COLORS.textPrimary, textAlign: 'center' }}
          value={d} onChangeText={t => handle(t, i)} keyboardType="number-pad" maxLength={1}
          autoFocus={i === 0}
        />
      ))}
    </View>
  );
}
