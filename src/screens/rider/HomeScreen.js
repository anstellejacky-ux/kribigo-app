import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Platform, Animated, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS, TX, VEHICLE_TYPES, POPULAR_PLACES, calcFare, isNightTime } from '../../utils/theme';
import { Btn, Card, Badge, Stars, Divider, Avatar } from '../../components';
import { Storage, TripAPI, DriverAPI } from '../../services/api';

const KRIBI = { latitude: 2.9374, longitude: 9.9060, latitudeDelta: 0.06, longitudeDelta: 0.06 };

export default function RiderHomeScreen({ route, navigation }) {
  const lang = route?.params?.lang || 'fr';
  const t = TX[lang];

  const [step, setStep] = useState('home'); // home | choose | searching | tracking | rating
  const [location, setLocation] = useState(null);
  const [destination, setDestination] = useState(null);
  const [selVehicle, setSelVehicle] = useState('taxi');
  const [payment, setPayment] = useState('cash');
  const [rideType, setRideType] = useState('now');
  const [rating, setRating] = useState(0);
  const [distKm, setDistKm] = useState(3.5);
  const [night, setNight] = useState(isNightTime());
  const [freeRide, setFreeRide] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({});
        setLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
      }
    })();
    // Pulse animation for searching state
    const pulse = Animated.loop(Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 1.3, duration: 800, useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
    ]));
    pulse.start();
    return () => pulse.stop();
  }, []);

  const handleSelectDest = (place) => {
    setDestination({ latitude: place.lat, longitude: place.lng, address: place.name });
    setStep('choose');
  };

  const handleBook = async () => {
    setStep('searching');
    setTimeout(() => setStep('tracking'), 3000); // Demo: auto-match after 3s
  };

  const handleComplete = () => {
    const newCount = 7; // demo
    if (newCount % 10 === 0) setFreeRide(true);
    setStep('rating');
  };

  const resetAll = () => {
    setStep('home'); setDestination(null); setRating(0); setRideType('now'); setDistKm(3.5);
  };

  const fare = calcFare(selVehicle, distKm, night);

  return (
    <View style={{ flex: 1 }}>
      {/* MAP */}
      <MapView style={StyleSheet.absoluteFill} provider={PROVIDER_GOOGLE} initialRegion={KRIBI} showsUserLocation>
        {destination && <Marker coordinate={destination} pinColor={COLORS.accent} />}
        {location && destination && (
          <Polyline coordinates={[location, destination]} strokeColor={COLORS.primary} strokeWidth={3} lineDashPattern={[6,3]} />
        )}
        {step === 'tracking' && (
          <Marker coordinate={{ latitude: 2.9400, longitude: 9.9080 }}>
            <View style={st.carMarker}><Text style={{ fontSize: 20 }}>🚗</Text></View>
          </Marker>
        )}
      </MapView>

      {/* TOP BAR */}
      <SafeAreaView style={st.topBar}>
        <View style={st.logoPill}>
          <Text style={{ fontWeight: '800', color: COLORS.primary, fontSize: 16 }}>Kribi<Text style={{ color: COLORS.accent }}>Go</Text></Text>
        </View>
        {night && <View style={st.nightPill}><Text style={{ color: COLORS.accent, fontSize: 12, fontWeight: '700' }}>🌙 {t.nightRates}</Text></View>}
      </SafeAreaView>

      {/* BOTTOM SHEET */}
      <View style={st.sheet}>

        {/* HOME */}
        {step === 'home' && (
          <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 340 }}>
            {freeRide && (
              <View style={st.freeBanner}>
                <Text style={{ fontSize: 20 }}>🎁</Text>
                <Text style={{ fontWeight: '800', color: '#7A5200', flex: 1 }}>{t.freeReady}</Text>
              </View>
            )}
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
              <TouchableOpacity style={[st.rideTypeTab, rideType === 'now' && st.rideTypeActive]} onPress={() => setRideType('now')}>
                <Text style={[st.rideTypeText, rideType === 'now' && { color: COLORS.primary }]}>{t.now}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[st.rideTypeTab, rideType === 'later' && st.rideTypeActive]} onPress={() => setRideType('later')}>
                <Text style={[st.rideTypeText, rideType === 'later' && { color: COLORS.primary }]}>{t.schedule}</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={st.searchBar} onPress={() => navigation.navigate('RiderSearch', { lang, onSelect: handleSelectDest })}>
              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.primary }} />
              <Text style={st.searchText}>{t.whereGoing}</Text>
              <Text style={{ color: COLORS.textMuted, fontSize: 18 }}>›</Text>
            </TouchableOpacity>
            <Text style={st.sectionLabel}>{t.popularKribi}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {POPULAR_PLACES.map(p => (
                <TouchableOpacity key={p.id} style={st.placeChip} onPress={() => handleSelectDest(p)}>
                  <Text>{p.emoji} {p.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </ScrollView>
        )}

        {/* CHOOSE VEHICLE */}
        {step === 'choose' && (
          <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 400 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
              <TouchableOpacity onPress={() => setStep('home')} style={{ marginRight: 12 }}>
                <Text style={{ fontSize: 22, color: COLORS.textMuted }}>←</Text>
              </TouchableOpacity>
              <Text style={st.sheetTitle}>{t.chooseRide}</Text>
            </View>
            <View style={st.routeSummary}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.primary }} />
                <Text style={{ fontSize: FONTS.sizes.sm, color: COLORS.textSecondary }}>Centre Ville, Kribi</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.accent }} />
                <Text style={{ fontSize: FONTS.sizes.sm, fontWeight: '700', color: COLORS.textPrimary }}>{destination?.address}</Text>
              </View>
            </View>
            {/* Distance slider */}
            <View style={{ backgroundColor: COLORS.background, borderRadius: RADIUS.md, padding: 10, marginBottom: 10 }}>
              <Text style={{ fontSize: 11, color: COLORS.textMuted, marginBottom: 4 }}>{t.distSim}: {distKm} {t.km}</Text>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                {[1,2,3,5,8,12,18].map(d => (
                  <TouchableOpacity key={d} onPress={() => setDistKm(d)} style={{ flex: 1, backgroundColor: distKm === d ? COLORS.primary : COLORS.border, borderRadius: 6, padding: 5, alignItems: 'center' }}>
                    <Text style={{ fontSize: 10, color: distKm === d ? COLORS.white : COLORS.textMuted, fontWeight: '700' }}>{d}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            {night && <View style={st.nightWarn}><Text style={{ color: COLORS.accent, fontSize: 12, fontWeight: '700' }}>🌙 {t.nightRates}</Text></View>}
            {freeRide && <View style={st.freeBanner}><Text style={{ fontSize: 18 }}>🎁</Text><Text style={{ fontWeight: '800', color: '#7A5200' }}>{t.freeReady}</Text></View>}
            {VEHICLE_TYPES.map(v => (
              <TouchableOpacity key={v.id} style={[st.vehicleRow, selVehicle === v.id && st.vehicleRowSel]} onPress={() => setSelVehicle(v.id)}>
                <Text style={{ fontSize: 26 }}>{v.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: '700', fontSize: FONTS.sizes.md }}>{lang === 'fr' ? v.nameFr : v.nameEn}</Text>
                  <Text style={{ fontSize: FONTS.sizes.xs, color: COLORS.textMuted }}>{lang === 'fr' ? v.descFr : v.descEn}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  {freeRide ? (
                    <>
                      <Text style={{ fontSize: 11, color: COLORS.textMuted, textDecorationLine: 'line-through' }}>{calcFare(v.id, distKm, night).toLocaleString()} XAF</Text>
                      <Text style={{ fontWeight: '800', color: COLORS.accent, fontSize: 13 }}>GRATUIT 🎁</Text>
                    </>
                  ) : (
                    <Text style={{ fontWeight: '800', fontSize: FONTS.sizes.md, color: COLORS.primary }}>{calcFare(v.id, distKm, night).toLocaleString()} XAF</Text>
                  )}
                </View>
              </TouchableOpacity>
            ))}
            <Divider />
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <Text style={{ fontSize: FONTS.sizes.sm, color: COLORS.textMuted }}>{t.payment}</Text>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                {[['cash', '💵 '+t.cash], ['mtn_momo', '📱 MTN'], ['orange', '🟠 Orange']].map(([id, lbl]) => (
                  <TouchableOpacity key={id} onPress={() => setPayment(id)} style={[st.payChip, payment === id && st.payChipSel]}>
                    <Text style={{ fontSize: 11, color: payment === id ? COLORS.primary : COLORS.textMuted, fontWeight: '600' }}>{lbl}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <Btn title={`${rideType === 'later' ? t.confirmBook : t.bookNow} — ${freeRide ? (lang==='fr'?'GRATUIT 🎁':'FREE 🎁') : fare.toLocaleString()+' XAF'}`} onPress={handleBook} />
          </ScrollView>
        )}

        {/* SEARCHING */}
        {step === 'searching' && (
          <View style={{ alignItems: 'center', padding: SPACING.xl }}>
            <Animated.Text style={{ fontSize: 52, transform: [{ scale: pulseAnim }] }}>🔍</Animated.Text>
            <Text style={[st.sheetTitle, { marginTop: 12 }]}>{t.searching}</Text>
            <Text style={{ color: COLORS.textMuted, marginTop: 8, textAlign: 'center' }}>
              {lang === 'fr' ? 'Connexion au chauffeur le plus proche...' : 'Connecting to nearest driver...'}
            </Text>
            <TouchableOpacity style={{ marginTop: SPACING.xl }} onPress={() => setStep('choose')}>
              <Text style={{ color: COLORS.danger, fontWeight: '600' }}>{t.cancel}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* TRACKING */}
        {step === 'tracking' && (
          <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 360 }}>
            <View style={st.notifGreen}>
              <Text style={{ fontSize: 8, color: '#2ECC71' }}>●</Text>
              <Text style={{ fontSize: 12, color: COLORS.primaryDark, fontWeight: '600', flex: 1 }}>
                {t.arriving} <Text style={{ fontWeight: '800' }}>3 {t.minAway}</Text>
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <Avatar name="Paul Manga" size={48} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: '700', fontSize: FONTS.sizes.lg }}>Paul Manga</Text>
                <Text style={{ fontSize: FONTS.sizes.xs, color: COLORS.textMuted }}>Honda CG 125 · CE 3847 K</Text>
                <Text style={{ color: COLORS.accent, fontSize: 14 }}>★★★★★ 4.9</Text>
              </View>
              <TouchableOpacity style={st.callBtn}><Text style={{ fontSize: 20 }}>📞</Text></TouchableOpacity>
            </View>
            <Divider />
            <View style={{ gap: 7, marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{ width: 9, height: 9, borderRadius: 4.5, backgroundColor: COLORS.primary }} />
                <Text style={{ fontSize: FONTS.sizes.sm }}>Centre Ville, Kribi</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{ width: 9, height: 9, borderRadius: 4.5, backgroundColor: COLORS.accent }} />
                <Text style={{ fontSize: FONTS.sizes.sm, fontWeight: '700' }}>{destination?.address}</Text>
              </View>
            </View>
            <Divider />
            <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginBottom: 14 }}>
              {[['3', t.minAway], [distKm+'', t.km], [fare.toLocaleString(), 'XAF']].map(([v, l]) => (
                <View key={l} style={{ alignItems: 'center' }}>
                  <Text style={{ fontWeight: '800', fontSize: 18, color: COLORS.primary }}>{v}</Text>
                  <Text style={{ fontSize: 10, color: COLORS.textMuted }}>{l}</Text>
                </View>
              ))}
            </View>
            <Btn title={lang === 'fr' ? 'Course terminée — ⭐ Noter' : 'Trip done — ⭐ Rate'} onPress={handleComplete} />
            <TouchableOpacity style={{ alignItems: 'center', marginTop: 10 }} onPress={() => setStep('choose')}>
              <Text style={{ color: COLORS.danger, fontWeight: '600', fontSize: FONTS.sizes.sm }}>{lang === 'fr' ? 'Annuler la course' : 'Cancel trip'}</Text>
            </TouchableOpacity>
          </ScrollView>
        )}

        {/* RATING */}
        {step === 'rating' && (
          <View style={{ alignItems: 'center', padding: SPACING.lg }}>
            <Text style={{ fontSize: 44, marginBottom: 8 }}>🎉</Text>
            <Text style={st.sheetTitle}>{t.tripDone}</Text>
            <Text style={{ color: COLORS.textMuted, marginBottom: SPACING.xl }}>{t.rateTrip}</Text>
            <Stars rating={rating} onRate={setRating} size={38} />
            <View style={{ backgroundColor: COLORS.primaryDark, borderRadius: RADIUS.md, padding: 12, marginTop: 16, marginBottom: 16, width: '100%' }}>
              <Text style={{ color: COLORS.white, fontWeight: '700', marginBottom: 4 }}>⭐ {lang === 'fr' ? 'Fidélité' : 'Loyalty'}</Text>
              <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>{lang === 'fr' ? '+1 récompense gagnée ! 7/10 courses' : '+1 reward earned! 7/10 rides'}</Text>
              <View style={{ backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20, height: 6, marginTop: 8, overflow: 'hidden' }}>
                <View style={{ backgroundColor: COLORS.accent, height: '100%', width: '70%', borderRadius: 20 }} />
              </View>
            </View>
            <Btn title={rating === 0 ? t.tapRate : t.submitRating} onPress={rating > 0 ? resetAll : undefined} disabled={rating === 0} style={{ width: '100%' }} />
          </View>
        )}
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  topBar: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 50 : 16 },
  logoPill: { backgroundColor: COLORS.white, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8, ...SHADOWS.md },
  nightPill: { backgroundColor: COLORS.textPrimary, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  sheet: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: COLORS.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: SPACING.xl, paddingBottom: 36, ...SHADOWS.lg },
  sheetTitle: { fontSize: FONTS.sizes.lg, fontWeight: '700', color: COLORS.textPrimary, marginBottom: SPACING.sm },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.background, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, padding: 12, marginBottom: 12, gap: 10 },
  searchText: { flex: 1, fontSize: FONTS.sizes.md, color: COLORS.textPlaceholder },
  sectionLabel: { fontSize: FONTS.sizes.xs, fontWeight: '700', color: COLORS.textMuted, textTransform: 'uppercase', marginBottom: 8 },
  placeChip: { backgroundColor: COLORS.background, borderRadius: RADIUS.full, paddingHorizontal: 13, paddingVertical: 8, borderWidth: 1, borderColor: COLORS.border, marginRight: 8, fontSize: FONTS.sizes.sm },
  rideTypeTab: { flex: 1, padding: 9, borderRadius: RADIUS.md, borderWidth: 1.5, borderColor: COLORS.border, alignItems: 'center' },
  rideTypeActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryLight },
  rideTypeText: { fontWeight: '700', fontSize: FONTS.sizes.sm, color: COLORS.textMuted },
  routeSummary: { backgroundColor: COLORS.background, borderRadius: RADIUS.md, padding: 12, marginBottom: 10 },
  vehicleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: RADIUS.md, borderWidth: 1.5, borderColor: COLORS.border, marginBottom: 7 },
  vehicleRowSel: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryLight },
  payChip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: RADIUS.full, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.background },
  payChipSel: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryLight },
  freeBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.accentLight, borderWidth: 1, borderColor: COLORS.accent, borderRadius: RADIUS.md, padding: 10, marginBottom: 10 },
  nightWarn: { backgroundColor: COLORS.textPrimary, borderRadius: RADIUS.md, padding: 9, marginBottom: 9 },
  notifGreen: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.primaryLight, borderWidth: 1, borderColor: COLORS.primary, borderRadius: RADIUS.md, padding: 9, marginBottom: 10 },
  callBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center' },
  carMarker: { width: 38, height: 38, borderRadius: 19, backgroundColor: COLORS.white, alignItems: 'center', justifyContent: 'center', ...SHADOWS.md },
});
