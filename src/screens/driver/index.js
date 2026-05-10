import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, ScrollView, FlatList, StyleSheet, Switch, Animated, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS, TX, TIERS } from '../../utils/theme';
import { Btn, Avatar, Divider } from '../../components';
import { Storage, DriverAPI } from '../../services/api';

// ── Driver Home Screen ────────────────────────────────────────────────────────
export function DriverHomeScreen({ route }) {
  const lang = route?.params?.lang || 'fr';
  const t = TX[lang];
  const [online, setOnline] = useState(false);
  const [request, setRequest] = useState(null);
  const reqTimer = useRef(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Demo driver state
  const driverTrips = 67;
  const currentTier = TIERS.slice().reverse().find(tr => driverTrips >= tr.min) || TIERS[0];
  const nextTier = TIERS[TIERS.indexOf(currentTier) + 1] || null;
  const progress = nextTier ? Math.min(100, Math.round(((driverTrips - currentTier.min) / (currentTier.max - currentTier.min + 1)) * 100)) : 100;

  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 1.15, duration: 1000, useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
    ])).start();
    return () => clearTimeout(reqTimer.current);
  }, []);

  const toggleOnline = async (val) => {
    setOnline(val);
    setRequest(null);
    clearTimeout(reqTimer.current);
    if (val) {
      try { await DriverAPI.setOnline(true); } catch {}
      reqTimer.current = setTimeout(() => setRequest({
        rider: 'Marie T.', rating: 4.2, pickup: 'Marché Central', dest: 'Plage Publique',
        fare: 3800, dist: 2.3, rushHour: true,
      }), 3000);
    }
  };

  const trips = [
    { time: '08:32', from: 'Centre Ville', to: 'Port', fare: 3500, bonus: '🔥 +350' },
    { time: '10:15', from: 'Hôtel Ilomba', to: 'Marché', fare: 3000, bonus: '' },
    { time: '13:40', from: 'Lobé Falls', to: 'Centre Ville', fare: 5000, bonus: '' },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>
      <ScrollView contentContainerStyle={{ padding: SPACING.lg, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>

        {/* Tier badge */}
        <View style={[st.tierBadge, { backgroundColor: currentTier.color }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={{ fontSize: 28 }}>{currentTier.icon}</Text>
              <View>
                <Text style={{ fontWeight: '800', fontSize: 16, color: COLORS.white }}>{currentTier.name}</Text>
                <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)' }}>{driverTrips} {lang === 'fr' ? 'courses' : 'trips'}</Text>
              </View>
            </View>
            <View style={{ backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: RADIUS.md, padding: 8, alignItems: 'center' }}>
              <Text style={{ fontWeight: '800', fontSize: 18, color: COLORS.white }}>{currentTier.commission}%</Text>
              <Text style={{ fontSize: 9, color: 'rgba(255,255,255,0.75)' }}>commission</Text>
            </View>
          </View>
          {nextTier && (
            <>
              <View style={{ backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20, height: 6, overflow: 'hidden', marginBottom: 5 }}>
                <View style={{ backgroundColor: 'rgba(255,255,255,0.85)', height: '100%', width: `${progress}%`, borderRadius: 20 }} />
              </View>
              <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.75)' }}>
                {nextTier.min - driverTrips} {lang === 'fr' ? 'courses avant' : 'trips to'} {nextTier.icon} {nextTier.name}
              </Text>
            </>
          )}
        </View>

        {/* Weekly challenge */}
        <View style={st.challengeCard}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <Text style={{ fontWeight: '800', color: COLORS.white, fontSize: 14 }}>{t.weeklyGoal}</Text>
            <View style={{ backgroundColor: COLORS.accent, borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 3 }}>
              <Text style={{ fontWeight: '800', fontSize: 11, color: COLORS.textPrimary }}>+5,000 XAF</Text>
            </View>
          </View>
          <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)', marginBottom: 8 }}>{t.weeklyBonus}</Text>
          <View style={{ backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20, height: 8, overflow: 'hidden', marginBottom: 5 }}>
            <View style={{ backgroundColor: COLORS.accent, height: '100%', width: '70%', borderRadius: 20 }} />
          </View>
          <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)', fontWeight: '600' }}>14/20 {t.history} — 6 {lang === 'fr' ? 'restantes' : 'to go'}</Text>
        </View>

        {/* Online toggle */}
        <View style={st.card}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <View>
              <Text style={{ fontWeight: '700', fontSize: 14, color: COLORS.textPrimary }}>{t.driverStatus}</Text>
              <Text style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 2 }}>{online ? t.searchingRiders : t.offline}</Text>
            </View>
            <Switch value={online} onValueChange={toggleOnline} trackColor={{ false: COLORS.border, true: COLORS.primary }} thumbColor={COLORS.white} />
          </View>
          {online && (
            <View style={{ backgroundColor: COLORS.primaryLight, borderWidth: 1, borderColor: COLORS.primary, borderRadius: RADIUS.md, padding: 9 }}>
              <Animated.Text style={{ fontSize: 12, color: COLORS.primaryDark, fontWeight: '600', transform: [{ scale: pulseAnim }] }}>
                🟢 {t.searchingRiders}
              </Animated.Text>
            </View>
          )}
        </View>

        {/* Incoming request */}
        {request && (
          <View style={st.requestCard}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <Text style={{ fontWeight: '700', fontSize: 13, color: COLORS.primary }}>{t.newRequest}</Text>
              <View style={{ backgroundColor: COLORS.primaryLight, borderRadius: RADIUS.full, paddingHorizontal: 9, paddingVertical: 3 }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: COLORS.primaryDark }}>⚡ {t.nearby}</Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <Avatar name={request.rider} size={34} color="#7B68EE" />
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: '700', fontSize: 13 }}>{request.rider}</Text>
                <Text style={{ color: COLORS.accent, fontSize: 12 }}>{'★'.repeat(Math.round(request.rating))}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ fontWeight: '800', fontSize: 17, color: COLORS.primary }}>{request.fare.toLocaleString()} XAF</Text>
                {request.rushHour && <Text style={{ fontSize: 11, color: COLORS.accent, fontWeight: '700' }}>🔥 +10% rush hour</Text>}
              </View>
            </View>
            <View style={{ gap: 5, marginBottom: 10 }}>
              {[[COLORS.primary, request.pickup], [COLORS.accent, request.dest]].map(([c, addr]) => (
                <View key={addr} style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: c }} />
                  <Text style={{ fontSize: 12 }}>{addr}</Text>
                </View>
              ))}
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity onPress={() => setRequest(null)} style={{ flex: 1, backgroundColor: COLORS.dangerLight, borderRadius: RADIUS.md, padding: 11, alignItems: 'center' }}>
                <Text style={{ color: COLORS.danger, fontWeight: '700', fontSize: 13 }}>{t.decline}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setRequest(null)} style={{ flex: 2, backgroundColor: COLORS.primary, borderRadius: RADIUS.md, padding: 11, alignItems: 'center' }}>
                <Text style={{ color: COLORS.white, fontWeight: '700', fontSize: 13 }}>{t.accept}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Stats */}
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: SPACING.md }}>
          {[['11,500', 'XAF'], ['3', lang==='fr'?'Courses':'Trips'], ['4.9', '★ Rating']].map(([v,l]) => (
            <View key={l} style={{ flex: 1, backgroundColor: COLORS.white, borderRadius: RADIUS.md, padding: 10, alignItems: 'center', ...SHADOWS.sm }}>
              <Text style={{ fontWeight: '800', fontSize: 17 }}>{v}</Text>
              <Text style={{ fontSize: 10, color: COLORS.textMuted, marginTop: 2 }}>{l}</Text>
            </View>
          ))}
        </View>

        {/* Today's trips */}
        <View style={st.card}>
          <Text style={{ fontWeight: '700', fontSize: 14, color: COLORS.textPrimary, marginBottom: 10 }}>{t.today}</Text>
          {trips.map((tr, i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 7, borderBottomWidth: i < trips.length-1 ? 1 : 0, borderBottomColor: COLORS.border }}>
              <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 8, color: COLORS.white, fontWeight: '700' }}>✓</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: '600', fontSize: 12 }}>{tr.from} → {tr.to}</Text>
                <Text style={{ fontSize: 11, color: COLORS.textMuted }}>{tr.time}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ fontWeight: '700', color: COLORS.primary, fontSize: 12 }}>{tr.fare.toLocaleString()} XAF</Text>
                {tr.bonus ? <Text style={{ fontSize: 10, color: COLORS.accent, fontWeight: '700' }}>{tr.bonus}</Text> : null}
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Driver Rewards Screen ─────────────────────────────────────────────────────
export function DriverRewardsScreen({ route }) {
  const lang = route?.params?.lang || 'fr';
  const t = TX[lang];
  const [trips, setTrips] = useState(67);
  const currentTier = TIERS.slice().reverse().find(tr => trips >= tr.min) || TIERS[0];
  const nextTier = TIERS[TIERS.indexOf(currentTier) + 1] || null;
  const progress = nextTier ? Math.min(100, Math.round(((trips - currentTier.min) / (currentTier.max - currentTier.min + 1)) * 100)) : 100;

  const bonuses = [
    { icon: '⭐', en: 'Perfect Rating Bonus', fr: 'Bonus Note Parfaite', val: '+2,000 XAF/sem.', condEn: 'Maintain 4.8+ all week', condFr: 'Maintenir 4.8+ toute la semaine', active: true },
    { icon: '🔥', en: 'Rush Hour Bonus', fr: 'Bonus Heures de Pointe', val: '+10%/course', condEn: 'Trips 7–9AM & 5–8PM', condFr: 'Courses 7h–9h et 17h–20h', active: true },
    { icon: '📅', en: 'Weekly Consistency', fr: 'Bonus Régularité', val: '+5,000 XAF/sem.', condEn: '20+ trips in a week', condFr: '20+ courses en une semaine', active: false },
    { icon: '👥', en: 'Referral Bonus', fr: 'Bonus Parrainage', val: '+10,000 XAF', condEn: 'Refer an active driver', condFr: 'Parrainer un chauffeur actif', active: false },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>
      <ScrollView contentContainerStyle={{ padding: SPACING.lg, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <Text style={st.pageTitle}>{t.rewards}</Text>

        {/* Current tier */}
        <View style={[st.tierBadge, { backgroundColor: currentTier.color, ...SHADOWS.lg, borderWidth: 3, borderColor: COLORS.accent }]}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <View>
              <Text style={{ fontSize: 44, marginBottom: 4 }}>{currentTier.icon}</Text>
              <Text style={{ fontWeight: '800', fontSize: 20, color: COLORS.white }}>{currentTier.name}</Text>
              <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', marginBottom: 10 }}>{trips} {lang === 'fr' ? 'courses · Niveau actuel' : 'trips · Current tier'}</Text>
              <View style={{ backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: RADIUS.md, padding: 8, alignSelf: 'flex-start', marginBottom: 10 }}>
                <Text style={{ fontWeight: '800', fontSize: 14, color: COLORS.white }}>{currentTier.commission}% commission — {lang === 'fr' ? 'économisez' : 'save'} {15 - currentTier.commission}% vs Bronze</Text>
              </View>
            </View>
          </View>
          {nextTier && (
            <>
              <View style={{ backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20, height: 7, overflow: 'hidden', marginBottom: 5 }}>
                <View style={{ backgroundColor: 'rgba(255,255,255,0.85)', height: '100%', width: `${progress}%`, borderRadius: 20 }} />
              </View>
              <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.8)' }}>{nextTier.min - trips} {t.tripsToNext} {nextTier.icon} {nextTier.name}</Text>
            </>
          )}
        </View>

        {/* Simulate button */}
        <TouchableOpacity onPress={() => setTrips(x => x + 1)} style={{ backgroundColor: COLORS.white, borderRadius: RADIUS.md, padding: 12, alignItems: 'center', marginBottom: SPACING.md, ...SHADOWS.sm, borderWidth: 1, borderColor: COLORS.border }}>
          <Text style={{ fontWeight: '700', color: COLORS.primary }}>{lang === 'fr' ? '▶ Simuler une course (+1)' : '▶ Simulate a trip (+1)'} — {trips} {lang === 'fr' ? 'courses' : 'trips'}</Text>
        </TouchableOpacity>

        {/* All tiers */}
        <Text style={st.sectionTitle}>{t.allTiers}</Text>
        {TIERS.map(tier => (
          <View key={tier.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: tier.id === currentTier.id ? '#FAFAFA' : COLORS.white, borderRadius: RADIUS.md, borderWidth: 1.5, borderColor: tier.id === currentTier.id ? tier.color : COLORS.border, padding: SPACING.md, marginBottom: SPACING.sm }}>
            <Text style={{ fontSize: 22 }}>{tier.icon}</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: '700', fontSize: 13, color: tier.id === currentTier.id ? tier.color : COLORS.textPrimary }}>
                {tier.name}{tier.id === currentTier.id ? (lang === 'fr' ? ' · ACTUEL' : ' · CURRENT') : ''}
              </Text>
              <Text style={{ fontSize: 11, color: COLORS.textMuted }}>{tier.min}{tier.max < 9999 ? `–${tier.max}` : '+'} {lang === 'fr' ? 'courses' : 'trips'}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ fontWeight: '800', fontSize: 15, color: tier.color }}>{tier.commission}%</Text>
              {tier.bonus && <Text style={{ fontSize: 10, color: COLORS.accent, fontWeight: '700' }}>+{tier.bonus.toLocaleString()} XAF/mois</Text>}
            </View>
          </View>
        ))}

        {/* Bonuses */}
        <Text style={st.sectionTitle}>{t.bonuses}</Text>
        {bonuses.map((b, i) => (
          <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: COLORS.white, borderRadius: RADIUS.md, borderWidth: 1, borderColor: b.active ? COLORS.accent : COLORS.border, padding: SPACING.md, marginBottom: SPACING.sm, opacity: b.active ? 1 : 0.6 }}>
            <Text style={{ fontSize: 26, width: 38 }}>{b.icon}</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: '700', fontSize: 12, color: COLORS.textPrimary }}>{lang === 'fr' ? b.fr : b.en}</Text>
              <Text style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 2 }}>{lang === 'fr' ? b.condFr : b.condEn}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ fontWeight: '800', fontSize: 13, color: b.active ? COLORS.primary : COLORS.textMuted }}>{b.val}</Text>
              <Text style={{ fontSize: 10, fontWeight: '700', color: b.active ? COLORS.primary : COLORS.textMuted, marginTop: 2 }}>{b.active ? (lang === 'fr' ? 'Actif' : 'Active') : (lang === 'fr' ? 'Verrouillé' : 'Locked')}</Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Driver Earnings Screen ────────────────────────────────────────────────────
export function DriverEarningsScreen({ route }) {
  const lang = route?.params?.lang || 'fr';
  const t = TX[lang];
  const weekData = [8200, 12400, 9800, 15600, 18900, 22100, 11500];
  const maxW = Math.max(...weekData);
  const days = lang === 'fr' ? ['Lun','Mar','Mer','Jeu','Ven','Sam','Auj'] : ['Mon','Tue','Wed','Thu','Fri','Sat','Today'];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>
      <ScrollView contentContainerStyle={{ padding: SPACING.lg, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <Text style={st.pageTitle}>{t.earnings}</Text>

        <View style={{ flexDirection: 'row', gap: 8, marginBottom: SPACING.md }}>
          <View style={{ flex: 1.3, backgroundColor: COLORS.primary, borderRadius: RADIUS.md, padding: SPACING.md, alignItems: 'center', ...SHADOWS.md }}>
            <Text style={{ fontSize: 20, fontWeight: '800', color: COLORS.white }}>11,500</Text>
            <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)' }}>XAF</Text>
            <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)', marginTop: 2, textAlign: 'center' }}>{t.today}</Text>
          </View>
          <View style={{ flex: 1, backgroundColor: COLORS.white, borderRadius: RADIUS.md, padding: SPACING.md, alignItems: 'center', ...SHADOWS.sm }}>
            <Text style={{ fontSize: 18, fontWeight: '800', color: COLORS.primary }}>54,200</Text>
            <Text style={{ fontSize: 10, color: COLORS.textMuted }}>{t.thisWeek}</Text>
          </View>
          <View style={{ flex: 1, backgroundColor: COLORS.white, borderRadius: RADIUS.md, padding: SPACING.md, alignItems: 'center', ...SHADOWS.sm }}>
            <Text style={{ fontSize: 18, fontWeight: '800', color: COLORS.primary }}>187K</Text>
            <Text style={{ fontSize: 10, color: COLORS.textMuted }}>{t.thisMonth}</Text>
          </View>
        </View>

        {/* Weekly challenge */}
        <View style={st.challengeCard}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <Text style={{ fontWeight: '800', color: COLORS.white, fontSize: 14 }}>{t.weeklyGoal}</Text>
            <View style={{ backgroundColor: COLORS.accent, borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 3 }}>
              <Text style={{ fontWeight: '800', fontSize: 11, color: COLORS.textPrimary }}>5,000 XAF</Text>
            </View>
          </View>
          <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)', marginBottom: 8 }}>{t.weeklyBonus}</Text>
          <View style={{ backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20, height: 8, overflow: 'hidden', marginBottom: 5 }}>
            <View style={{ backgroundColor: COLORS.accent, height: '100%', width: '70%', borderRadius: 20 }} />
          </View>
          <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)', fontWeight: '600' }}>14/20 — 6 {lang === 'fr' ? 'restantes' : 'to go'}</Text>
        </View>

        {/* Bar chart */}
        <View style={st.card}>
          <Text style={{ fontWeight: '700', fontSize: 14, color: COLORS.textPrimary, marginBottom: SPACING.md }}>{lang === 'fr' ? 'Gains quotidiens (7 jours)' : 'Daily earnings (7 days)'}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 100 }}>
            {weekData.map((v, i) => (
              <View key={i} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
                <View style={{ width: '100%', height: Math.max(4, Math.round((v / maxW) * 85)), backgroundColor: COLORS.primary, borderRadius: 3, opacity: i === weekData.length-1 ? 1 : 0.45 }} />
                <Text style={{ fontSize: 9, color: COLORS.textMuted }}>{days[i]}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Payout info */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.md, backgroundColor: COLORS.white, borderRadius: RADIUS.md, padding: SPACING.md, ...SHADOWS.sm }}>
          <Text style={{ fontSize: 22 }}>📱</Text>
          <Text style={{ fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, flex: 1 }}>{t.payoutInfo}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Driver History ────────────────────────────────────────────────────────────
export function DriverHistoryScreen({ route }) {
  const lang = route?.params?.lang || 'fr';
  const t = TX[lang];
  const trips = [
    { id:'1', from:'Centre Ville', to:'Port de Kribi', fare: 3500, time:'08:32', bonus:'' },
    { id:'2', from:'Hôtel Ilomba', to:'Marché Central', fare: 3000, time:'10:15', bonus:'🔥 +300' },
    { id:'3', from:'Lobé Falls', to:'Centre Ville', fare: 5000, time:'13:40', bonus:'' },
    { id:'4', from:'Centre Ville', to:'Plage Publique', fare: 3200, time:'15:22', bonus:'🔥 +320' },
  ];
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>
      <View style={{ padding: SPACING.lg }}>
        <Text style={st.pageTitle}>{t.history}</Text>
      </View>
      <FlatList data={trips} keyExtractor={i => i.id} contentContainerStyle={{ paddingHorizontal: SPACING.lg, paddingBottom: 40 }}
        renderItem={({ item }) => (
          <View style={{ backgroundColor: COLORS.white, borderRadius: RADIUS.md, padding: SPACING.md, marginBottom: SPACING.sm, flexDirection: 'row', alignItems: 'center', gap: SPACING.md, ...SHADOWS.sm }}>
            <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 11, color: COLORS.white, fontWeight: '700' }}>✓</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: '700', fontSize: FONTS.sizes.sm }}>{item.from} → {item.to}</Text>
              <Text style={{ fontSize: FONTS.sizes.xs, color: COLORS.textMuted, marginTop: 1 }}>{item.time}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ fontWeight: '800', color: COLORS.primary, fontSize: FONTS.sizes.md }}>{item.fare.toLocaleString()} XAF</Text>
              {item.bonus ? <Text style={{ fontSize: 10, color: COLORS.accent, fontWeight: '700' }}>{item.bonus}</Text> : null}
            </View>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

// ── Driver Profile ────────────────────────────────────────────────────────────
export function DriverProfileScreen({ route, navigation }) {
  const lang = route?.params?.lang || 'fr';
  const t = TX[lang];

  const handleLogout = async () => {
    await Storage.clear();
    navigation.replace('Splash');
  };

  const handleLangToggle = async () => {
    const newLang = lang === 'fr' ? 'en' : 'fr';
    await Storage.setLang(newLang);
    Alert.alert('', lang === 'fr' ? "Redémarrez l'app pour appliquer." : 'Restart the app to apply.');
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>
      <ScrollView contentContainerStyle={{ padding: SPACING.lg }}>
        <Text style={st.pageTitle}>{t.profile}</Text>
        <View style={{ alignItems: 'center', marginBottom: SPACING.xl }}>
          <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.md }}>
            <Text style={{ fontSize: 28, fontWeight: '700', color: COLORS.white }}>PM</Text>
          </View>
          <Text style={{ fontSize: FONTS.sizes.lg, fontWeight: '700', color: COLORS.textPrimary }}>Paul Manga</Text>
          <Text style={{ fontSize: FONTS.sizes.sm, color: COLORS.textMuted }}>Honda CG 125 · CE 3847 K</Text>
          <Text style={{ color: COLORS.accent, fontSize: 14, marginTop: 2 }}>★★★★★ 4.9</Text>
        </View>
        {[
          { icon: '🌍', label: t.language, onPress: handleLangToggle },
          { icon: '🏆', label: lang === 'fr' ? 'Mes récompenses' : 'My rewards', onPress: () => {} },
          { icon: '❓', label: lang === 'fr' ? 'Aide & Support' : 'Help & Support', onPress: () => {} },
        ].map((item, i) => (
          <TouchableOpacity key={i} onPress={item.onPress} style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.md, backgroundColor: COLORS.white, borderRadius: RADIUS.md, padding: SPACING.lg, marginBottom: SPACING.sm, ...SHADOWS.sm }}>
            <Text style={{ fontSize: 22 }}>{item.icon}</Text>
            <Text style={{ flex: 1, fontSize: FONTS.sizes.md, color: COLORS.textPrimary }}>{item.label}</Text>
            <Text style={{ color: COLORS.textMuted, fontSize: 18 }}>›</Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity onPress={handleLogout} style={{ backgroundColor: COLORS.dangerLight, borderRadius: RADIUS.md, padding: SPACING.lg, alignItems: 'center', marginTop: SPACING.md }}>
          <Text style={{ color: COLORS.danger, fontWeight: '700', fontSize: FONTS.sizes.md }}>{t.signOut}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  pageTitle: { fontSize: FONTS.sizes.xxl, fontWeight: '800', color: COLORS.textPrimary, marginBottom: SPACING.sm },
  sectionTitle: { fontSize: FONTS.sizes.lg, fontWeight: '700', color: COLORS.textPrimary, marginBottom: SPACING.md, marginTop: SPACING.sm },
  card: { backgroundColor: COLORS.white, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border, padding: SPACING.lg, marginBottom: SPACING.md, ...SHADOWS.sm },
  tierBadge: { borderRadius: RADIUS.lg, padding: SPACING.xl, marginBottom: SPACING.md },
  challengeCard: { backgroundColor: COLORS.primaryDark, borderRadius: RADIUS.lg, padding: SPACING.lg, marginBottom: SPACING.md, ...SHADOWS.md },
  requestCard: { borderWidth: 1.5, borderColor: COLORS.primary, borderRadius: RADIUS.lg, padding: SPACING.lg, marginBottom: SPACING.md },
});

export default DriverHomeScreen;
