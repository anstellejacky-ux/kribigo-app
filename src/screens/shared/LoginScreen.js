import React, { useState } from 'react';
import { View, Text, TouchableOpacity, KeyboardAvoidingView, ScrollView, Platform, Alert, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, FONTS, SPACING, RADIUS, TX } from '../../utils/theme';
import { Btn, PhoneInput, OTPInput } from '../../components';
import { AuthAPI, Storage } from '../../services/api';

export default function LoginScreen({ navigation, route }) {
  const mode = route?.params?.mode || 'rider';
  const [lang, setLang] = useState('fr');
  const t = TX[lang];

  const [step, setStep] = useState('phone');
  const [phone, setPhone] = useState('+237');
  const [otp, setOtp] = useState(['','','','','','']);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const sendOTP = async () => {
    if (phone.length < 9) { Alert.alert('', lang === 'fr' ? 'Numéro invalide' : 'Invalid number'); return; }
    setLoading(true);
    try {
      if (mode === 'driver') await AuthAPI.requestDriverOTP(phone);
      else await AuthAPI.requestUserOTP(phone);
      setStep('otp');
    } catch (e) {
      // Dev mode - skip SMS
      setStep('otp');
    } finally { setLoading(false); }
  };

  const verifyOTP = async () => {
    const code = otp.join('');
    if (code.length !== 6) return;
    setLoading(true);
    try {
      let data;
      if (mode === 'driver') {
        const res = await AuthAPI.verifyDriverOTP(phone, code);
        data = res.data;
        await Storage.setTokens(data.access_token, data.refresh_token);
        await Storage.setDriver(data.driver);
        await Storage.setLang(lang);
        navigation.replace('DriverApp', { lang });
      } else {
        const res = await AuthAPI.verifyUserOTP(phone, code, name || null);
        data = res.data;
        await Storage.setTokens(data.access_token, data.refresh_token);
        await Storage.setUser(data.user);
        await Storage.setLang(lang);
        navigation.replace('RiderApp', { lang });
      }
    } catch (e) {
      // Dev bypass — remove in production
      await Storage.setLang(lang);
      if (mode === 'driver') {
        await Storage.setDriver({ name: 'Paul Manga', vehicle_type: 'moto', vehicle_plate: 'CE 3847 K', rating: 4.9, total_trips: 67 });
        navigation.replace('DriverApp', { lang });
      } else {
        await Storage.setUser({ name: name || 'Rider', phone });
        navigation.replace('RiderApp', { lang });
      }
    } finally { setLoading(false); }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.white }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={st.scroll} keyboardShouldPersistTaps="handled">

          {/* Header */}
          <View style={st.header}>
            <Text style={st.logo}>Kribi<Text style={{ color: COLORS.accent }}>Go</Text></Text>
            {mode === 'driver' && (
              <View style={{ backgroundColor: COLORS.accentLight, borderRadius: RADIUS.full, paddingHorizontal: 14, paddingVertical: 5, marginTop: 8 }}>
                <Text style={{ color: '#7A5200', fontWeight: '700', fontSize: FONTS.sizes.sm }}>🚗 {lang === 'fr' ? 'Espace Chauffeur' : 'Driver Portal'}</Text>
              </View>
            )}
            <Text style={st.tagline}>{t.tagline}</Text>
          </View>

          {/* Phone step */}
          {step === 'phone' && (
            <View style={st.form}>
              <Text style={st.label}>{t.enterPhone}</Text>
              <PhoneInput value={phone} onChangeText={setPhone} placeholder="+237 6XX XXX XXX" />
              <Btn title={t.sendCode} onPress={sendOTP} loading={loading} style={{ marginTop: 20 }} />
              <TouchableOpacity style={st.switchBtn} onPress={() => navigation.replace('Login', { mode: mode === 'rider' ? 'driver' : 'rider' })}>
                <Text style={st.switchText}>{mode === 'rider' ? t.areYouDriver : t.areYouRider}</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* OTP step */}
          {step === 'otp' && (
            <View style={st.form}>
              <Text style={st.label}>{t.enterCode}</Text>
              <Text style={{ fontSize: FONTS.sizes.sm, color: COLORS.textMuted, marginBottom: SPACING.xl }}>
                {t.codeSent} <Text style={{ fontWeight: '700', color: COLORS.textPrimary }}>{phone}</Text>
              </Text>
              <OTPInput otp={otp} onChange={setOtp} />
              <Btn title={t.verify} onPress={verifyOTP} disabled={otp.some(d => !d)} loading={loading} style={{ marginTop: 24 }} />
              <TouchableOpacity style={st.switchBtn} onPress={() => { setStep('phone'); setOtp(['','','','','','']); }}>
                <Text style={st.switchText}>{t.resend}</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Language toggle */}
          <TouchableOpacity style={st.langBtn} onPress={() => setLang(l => l === 'fr' ? 'en' : 'fr')}>
            <Text style={st.langText}>{lang === 'fr' ? '🇬🇧 English' : '🇫🇷 Français'}</Text>
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  scroll: { flexGrow: 1, padding: SPACING.xl },
  header: { alignItems: 'center', paddingTop: 50, paddingBottom: 40 },
  logo: { fontSize: 52, fontWeight: '800', color: COLORS.primary, letterSpacing: -1 },
  tagline: { fontSize: FONTS.sizes.md, color: COLORS.textMuted, marginTop: 6 },
  form: { flex: 1 },
  label: { fontSize: FONTS.sizes.lg, fontWeight: '700', color: COLORS.textPrimary, marginBottom: SPACING.md },
  switchBtn: { alignItems: 'center', padding: SPACING.lg, marginTop: SPACING.sm },
  switchText: { color: COLORS.primary, fontWeight: '600', fontSize: FONTS.sizes.sm },
  langBtn: { alignItems: 'center', padding: SPACING.lg, marginTop: SPACING.xl },
  langText: { color: COLORS.textMuted, fontSize: FONTS.sizes.sm },
});
