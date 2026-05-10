import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, ScrollView, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS, TX, POPULAR_PLACES } from '../../utils/theme';
import { Storage } from '../../services/api';

// ── Search Screen ─────────────────────────────────────────────────────────────
export function SearchScreen({ navigation, route }) {
  const lang = route?.params?.lang || 'fr';
  const t = TX[lang];
  const onSelect = route.params?.onSelect;
  const [query, setQuery] = useState('');

  const filtered = query.length > 1
    ? POPULAR_PLACES.filter(p => p.name.toLowerCase().includes(query.toLowerCase()))
    : POPULAR_PLACES;

  const pick = (place) => {
    if (onSelect) onSelect(place);
    navigation.goBack();
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.white }}>
      <View style={s.searchHeader}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 4 }}>
          <Text style={{ fontSize: 22, color: COLORS.textPrimary }}>←</Text>
        </TouchableOpacity>
        <TextInput style={s.searchInput} placeholder={t.whereGoing} placeholderTextColor={COLORS.textPlaceholder}
          value={query} onChangeText={setQuery} autoFocus />
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md }}>
        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.primary }} />
        <Text style={{ fontSize: FONTS.sizes.sm, color: COLORS.textSecondary }}>{t.yourLoc}</Text>
      </View>
      <View style={{ height: 1, backgroundColor: COLORS.border, marginHorizontal: SPACING.lg }} />
      <Text style={s.secLabel}>{lang === 'fr' ? 'Populaire à Kribi' : 'Popular in Kribi'}</Text>
      <FlatList data={filtered} keyExtractor={i => i.id}
        renderItem={({ item }) => (
          <TouchableOpacity style={s.placeRow} onPress={() => pick(item)} activeOpacity={0.7}>
            <View style={s.placeIcon}><Text style={{ fontSize: 22 }}>{item.emoji}</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={s.placeName}>{item.name}</Text>
              <Text style={s.placeHint}>{item.hint}</Text>
            </View>
            <Text style={{ color: COLORS.textMuted, fontSize: 18 }}>›</Text>
          </TouchableOpacity>
        )}
        ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: COLORS.border, marginLeft: 76 }} />}
        contentContainerStyle={{ paddingBottom: 32 }}
      />
    </SafeAreaView>
  );
}

// ── Loyalty Screen ────────────────────────────────────────────────────────────
export function LoyaltyScreen({ route }) {
  const lang = route?.params?.lang || 'fr';
  const t = TX[lang];
  const done = 7; // demo — in production fetch from API
  const total = 47;
  const pct = (done / 10) * 100;
  const remaining = 10 - done;

  const steps = lang === 'fr'
    ? [['1','Complétez une course payante','+1 point ajouté automatiquement'],['2','Suivez votre progression','La barre se remplit à chaque course'],['3','La 10ème course est gratuite','Appliquée automatiquement'],['4','Le compteur repart à 0','Le cycle recommence indéfiniment']]
    : [['1','Complete a paid ride','+1 point added automatically'],['2','Track your progress','Bar fills with each ride'],['3','10th ride is free','Automatically applied at booking'],['4','Counter resets to 0','Cycle repeats indefinitely']];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>
      <ScrollView contentContainerStyle={{ padding: SPACING.lg, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <Text style={s.pageTitle}>{t.myRewards}</Text>
        <Text style={{ color: COLORS.textMuted, marginBottom: SPACING.lg }}>{t.loyaltySub}</Text>

        {/* Progress card */}
        <View style={s.loyaltyCard}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
            <Text style={{ fontWeight: '800', fontSize: 15, color: COLORS.white }}>⭐ {t.myRewards}</Text>
            <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>{total} {lang === 'fr' ? 'totales' : 'total'}</Text>
          </View>
          <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', marginBottom: 12 }}>{t.loyaltySub}</Text>
          <View style={{ flexDirection: 'row', gap: 5, marginBottom: 10 }}>
            {Array.from({ length: 10 }, (_, i) => (
              <View key={i} style={[s.dot, i < done && s.dotDone, i === 9 && s.dotFree]}>
                <Text style={{ fontSize: i === 9 ? 11 : 9, color: COLORS.white }}>{i === 9 ? '🎁' : i < done ? '✓' : ''}</Text>
              </View>
            ))}
          </View>
          <View style={s.progressTrack}><View style={[s.progressFill, { width: `${pct}%` }]} /></View>
          <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.85)', fontWeight: '600', marginTop: 5 }}>
            {remaining} {t.ridesLeft}
          </Text>
        </View>

        {/* Stats */}
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: SPACING.lg }}>
          {[[total, t.totalRides], [Math.floor(total/10), t.freeEarned], [`${done}/10`, lang==='fr'?'ce cycle':'this cycle']].map(([v,l]) => (
            <View key={l} style={{ flex: 1, backgroundColor: COLORS.white, borderRadius: RADIUS.md, padding: SPACING.md, alignItems: 'center', ...SHADOWS.sm }}>
              <Text style={{ fontSize: FONTS.sizes.xl, fontWeight: '800', color: COLORS.primary }}>{v}</Text>
              <Text style={{ fontSize: FONTS.sizes.xs, color: COLORS.textMuted, marginTop: 2, textAlign: 'center' }}>{l}</Text>
            </View>
          ))}
        </View>

        {/* How it works */}
        <Text style={s.sectionTitle}>{t.howWorks}</Text>
        {steps.map(([num, title, body]) => (
          <View key={num} style={{ flexDirection: 'row', gap: 12, backgroundColor: COLORS.white, borderRadius: RADIUS.md, padding: SPACING.md, marginBottom: SPACING.sm, ...SHADOWS.sm }}>
            <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Text style={{ color: COLORS.white, fontWeight: '700', fontSize: 12 }}>{num}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: '700', fontSize: FONTS.sizes.sm, color: COLORS.textPrimary, marginBottom: 2 }}>{title}</Text>
              <Text style={{ fontSize: FONTS.sizes.xs, color: COLORS.textMuted }}>{body}</Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

// ── History Screen ────────────────────────────────────────────────────────────
export function HistoryScreen({ route }) {
  const lang = route?.params?.lang || 'fr';
  const t = TX[lang];
  const trips = [
    { id: '1', dest: 'Chutes de la Lobé', fare: 5000, vehicle: '🚕', date: lang==='fr'?'Auj. 09:14':'Today 09:14', pts: '+1' },
    { id: '2', dest: 'Port de Kribi', fare: 3000, vehicle: '🏍️', date: lang==='fr'?'Hier':'Yesterday', pts: '+1' },
    { id: '3', dest: 'Marché Central', fare: 3500, vehicle: '🚕', date: 'Lun.', pts: '+1' },
    { id: '4', dest: 'Plage Publique', fare: 3000, vehicle: '🏍️', date: 'Dim.', pts: '+1' },
    { id: '5', dest: 'Hôtel Ilomba', fare: 4500, vehicle: '🚕', date: 'Sam.', pts: '+1' },
  ];
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>
      <View style={{ padding: SPACING.lg }}>
        <Text style={s.pageTitle}>{t.history}</Text>
      </View>
      <FlatList data={trips} keyExtractor={i => i.id} contentContainerStyle={{ paddingHorizontal: SPACING.lg, paddingBottom: 40 }}
        renderItem={({ item }) => (
          <View style={{ backgroundColor: COLORS.white, borderRadius: RADIUS.md, padding: SPACING.md, marginBottom: SPACING.sm, flexDirection: 'row', alignItems: 'center', gap: SPACING.md, ...SHADOWS.sm }}>
            <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 22 }}>{item.vehicle}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: '700', fontSize: FONTS.sizes.md, color: COLORS.textPrimary }}>{item.dest}</Text>
              <Text style={{ fontSize: FONTS.sizes.xs, color: COLORS.textMuted, marginTop: 2 }}>{item.date}</Text>
              <Text style={{ fontSize: FONTS.sizes.xs, color: COLORS.accent, marginTop: 1 }}>★★★★★</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ fontWeight: '800', fontSize: FONTS.sizes.md, color: COLORS.primary }}>{item.fare.toLocaleString()} XAF</Text>
              <Text style={{ fontSize: FONTS.sizes.xs, color: COLORS.primary, marginTop: 2 }}>⭐ {item.pts}</Text>
            </View>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

// ── Profile Screen ────────────────────────────────────────────────────────────
export function ProfileScreen({ route, navigation }) {
  const lang = route?.params?.lang || 'fr';
  const t = TX[lang];

  const handleLogout = async () => {
    await Storage.clear();
    navigation.replace('Splash');
  };

  const handleLangToggle = async () => {
    const newLang = lang === 'fr' ? 'en' : 'fr';
    await Storage.setLang(newLang);
    Alert.alert('', lang === 'fr' ? 'Redémarrez l\'app pour appliquer la langue.' : 'Restart the app to apply language change.');
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>
      <ScrollView contentContainerStyle={{ padding: SPACING.lg }}>
        <Text style={s.pageTitle}>{t.profile}</Text>

        <View style={{ alignItems: 'center', marginBottom: SPACING.xl }}>
          <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.md }}>
            <Text style={{ fontSize: 28, fontWeight: '700', color: COLORS.white }}>KG</Text>
          </View>
          <Text style={{ fontSize: FONTS.sizes.lg, fontWeight: '700', color: COLORS.textPrimary }}>KribiGo Rider</Text>
          <Text style={{ fontSize: FONTS.sizes.sm, color: COLORS.textMuted }}>+237 6XX XXX XXX</Text>
        </View>

        {[
          { icon: '🌍', label: t.language, onPress: handleLangToggle },
          { icon: '⭐', label: lang === 'fr' ? 'Mes récompenses' : 'My rewards', onPress: () => {} },
          { icon: '🔔', label: lang === 'fr' ? 'Notifications' : 'Notifications', onPress: () => {} },
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

const s = StyleSheet.create({
  searchHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md, gap: SPACING.sm, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  searchInput: { flex: 1, fontSize: FONTS.sizes.md, color: COLORS.textPrimary, backgroundColor: COLORS.background, borderRadius: RADIUS.md, paddingHorizontal: SPACING.md, paddingVertical: 10 },
  secLabel: { fontSize: FONTS.sizes.xs, fontWeight: '700', color: COLORS.textMuted, textTransform: 'uppercase', paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md },
  placeRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md },
  placeIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center' },
  placeName: { fontSize: FONTS.sizes.md, fontWeight: '600', color: COLORS.textPrimary, marginBottom: 2 },
  placeHint: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted },
  pageTitle: { fontSize: FONTS.sizes.xxl, fontWeight: '800', color: COLORS.textPrimary, marginBottom: SPACING.sm },
  loyaltyCard: { backgroundColor: COLORS.primary, borderRadius: RADIUS.lg, padding: SPACING.xl, marginBottom: SPACING.md, ...SHADOWS.md },
  dot: { flex: 1, height: 26, borderRadius: 13, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.3)', alignItems: 'center', justifyContent: 'center' },
  dotDone: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  dotFree: { borderColor: COLORS.accent },
  progressTrack: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20, height: 7, overflow: 'hidden' },
  progressFill: { backgroundColor: COLORS.accent, height: '100%', borderRadius: 20 },
  sectionTitle: { fontSize: FONTS.sizes.lg, fontWeight: '700', color: COLORS.textPrimary, marginBottom: SPACING.md },
});

export default SearchScreen;
