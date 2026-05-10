export const COLORS = {
  primary: '#1B6B4A',
  primaryDark: '#0D4A32',
  primaryLight: '#E8F5EF',
  accent: '#F4A827',
  accentLight: '#FEF3D8',
  white: '#FFFFFF',
  background: '#F7F7F5',
  surface: '#FFFFFF',
  border: '#EEEDE8',
  borderMed: '#C4C2BA',
  textPrimary: '#1A1A18',
  textSecondary: '#444441',
  textMuted: '#888780',
  textPlaceholder: '#C4C2BA',
  success: '#1B6B4A',
  warning: '#F4A827',
  danger: '#C0392B',
  dangerLight: '#FDECEA',
  info: '#185FA5',
  infoLight: '#E6F1FB',
  bronze: '#C89B40',
  silver: '#9CA3AF',
  gold: '#D4A017',
  diamond: '#2980B9',
};

export const FONTS = {
  sizes: { xs: 11, sm: 13, md: 15, lg: 17, xl: 20, xxl: 24, xxxl: 32 },
};

export const SPACING = {
  xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32,
};

export const RADIUS = {
  sm: 8, md: 12, lg: 16, xl: 24, full: 999,
};

export const SHADOWS = {
  sm: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 },
  md: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 8, elevation: 4 },
  lg: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.16, shadowRadius: 16, elevation: 8 },
};

export const TIERS = [
  { id: 'bronze',  icon: '🥉', name: 'Bronze',  min: 0,   max: 49,   commission: 15, bonus: null,  color: COLORS.bronze },
  { id: 'silver',  icon: '🥈', name: 'Silver',  min: 50,  max: 149,  commission: 12, bonus: null,  color: COLORS.silver },
  { id: 'gold',    icon: '🥇', name: 'Gold',    min: 150, max: 299,  commission: 10, bonus: 5000,  color: COLORS.gold   },
  { id: 'diamond', icon: '💎', name: 'Diamond', min: 300, max: 9999, commission: 8,  bonus: 15000, color: COLORS.diamond},
];

export const POPULAR_PLACES = [
  { id: '1', name: 'Chutes de la Lobé',  emoji: '🌊', hint: '12 km', lat: 2.8833, lng: 9.9167 },
  { id: '2', name: 'Port de Kribi',      emoji: '⚓', hint: '3.5 km', lat: 2.9500, lng: 9.9333 },
  { id: '3', name: 'Marché Central',     emoji: '🛒', hint: '1.2 km', lat: 2.9400, lng: 9.9100 },
  { id: '4', name: 'Plage Publique',     emoji: '🏖️', hint: '2 km',  lat: 2.9300, lng: 9.9200 },
  { id: '5', name: 'Hôtel Ilomba Beach', emoji: '🏨', hint: '5.5 km', lat: 2.9100, lng: 9.9165 },
  { id: '6', name: 'Kribi Aéroport',    emoji: '✈️', hint: '8 km',   lat: 2.8978, lng: 9.9783 },
];

export const VEHICLE_TYPES = [
  { id: 'moto', icon: '🏍️', nameEn: 'MotoExpress', nameFr: 'MotoExpress', descEn: 'Fast · 1 passenger', descFr: 'Rapide · 1 passager', base: 3000, perKm: 300, nightBase: 4000, nightPerKm: 400 },
  { id: 'taxi', icon: '🚕', nameEn: 'Kribi Taxi',  nameFr: 'Kribi Taxi',  descEn: 'Comfortable · 4',   descFr: 'Confortable · 4',    base: 3000, perKm: 300, nightBase: 4000, nightPerKm: 400 },
  { id: 'van',  icon: '🚐', nameEn: 'Group Van',   nameFr: 'Group Van',   descEn: 'Up to 8 passengers', descFr: "Jusqu'à 8 passagers", base: 5000, perKm: 400, nightBase: 6000, nightPerKm: 500 },
];

// Fare calculation
export function calcFare(vehicleId, distKm = 3.5, isNight = false, numStops = 2) {
  const v = VEHICLE_TYPES.find(x => x.id === vehicleId);
  if (!v) return 0;
  const base = isNight ? v.nightBase : v.base;
  const perKm = isNight ? v.nightPerKm : v.perKm;
  const extraDist = Math.max(0, distKm - 3);
  const distCharge = Math.round(extraDist * perKm);
  const stopCharge = Math.max(0, numStops - 2) * 500;
  return Math.ceil((base + distCharge + stopCharge) / 100) * 100;
}

export function isNightTime(timeStr) {
  const h = timeStr ? parseInt(timeStr.split(':')[0]) : new Date().getHours();
  return h >= 21 || h < 6;
}

// Translations
export const TX = {
  en: {
    // Auth
    welcome: 'Welcome to KribiGo', tagline: 'Rides across Kribi', enterPhone: 'Your phone number',
    sendCode: 'Send code', enterCode: 'Enter 6-digit code', codeSent: 'Code sent to', verify: 'Verify',
    resend: 'Resend code', areYouDriver: 'Are you a driver? →', areYouRider: 'Are you a rider? →',
    // Rider
    whereGoing: 'Where are you going?', yourLoc: 'Your location — Centre Ville',
    enterDest: 'Enter destination...', popularKribi: 'Popular in Kribi', addStop: '+ Add a stop',
    now: '⚡ Now', schedule: '📅 Schedule', chooseRide: 'Choose a ride',
    bookNow: 'Book now', confirmBook: 'Confirm booking', payment: 'Payment',
    searching: 'Finding your driver...', driverFound: 'Driver found!',
    arriving: 'Driver arriving in', minAway: 'min', liveTracking: 'Live tracking',
    tripDone: 'Trip complete!', rateTrip: 'How was your trip?', submitRating: 'Submit',
    tapRate: 'Tap to rate', recentTrips: 'Recent trips', nearbyDrivers: 'Nearby drivers',
    // Loyalty
    myRewards: 'My Rewards', loyaltySub: '10 rides = 1 free ride!',
    ridesLeft: 'rides to free ride', freeReady: '🎉 Free ride ready!',
    howWorks: 'How it works', totalRides: 'Total rides', freeEarned: 'Free rides earned',
    // Driver
    driverStatus: 'Driver Status', online: 'Online', offline: 'Offline',
    goOnline: 'Go online to receive requests', searchingRiders: 'Searching for riders...',
    newRequest: 'New ride request!', nearby: 'Nearby', decline: 'Decline', accept: 'Accept',
    // Rewards
    rewards: 'Rewards', yourTier: 'Your Tier', allTiers: 'All Tiers',
    bonuses: 'Active Bonuses', tripsToNext: 'trips to next tier', atTop: 'Maximum tier! 💎',
    // Earnings
    earnings: 'Earnings', today: 'Today', thisWeek: 'This week', thisMonth: 'This month',
    weeklyGoal: 'Weekly Goal', weeklyBonus: '+5,000 XAF for 20 trips',
    payoutInfo: 'Payout every Friday via MTN MoMo',
    // Common
    home: 'Home', history: 'Trips', profile: 'Profile', cancel: 'Cancel',
    back: 'Back', save: 'Save', cash: 'Cash', mtnMomo: 'MTN MoMo', orange: 'Orange',
    signOut: 'Sign out', language: 'Language: English', fare: 'Fare', km: 'km',
    distSim: 'Distance simulator', adjustFare: 'Adjust to see fare change',
    nightRates: '🌙 Night rates active', dayRates: '☀️ Day rates',
  },
  fr: {
    welcome: 'Bienvenue sur KribiGo', tagline: 'Des courses à Kribi', enterPhone: 'Votre numéro',
    sendCode: 'Envoyer le code', enterCode: 'Code à 6 chiffres', codeSent: 'Code envoyé au', verify: 'Vérifier',
    resend: 'Renvoyer le code', areYouDriver: 'Vous êtes chauffeur ? →', areYouRider: 'Vous êtes passager ? →',
    whereGoing: 'Où allez-vous ?', yourLoc: 'Votre position — Centre Ville',
    enterDest: 'Entrez la destination...', popularKribi: 'Populaire à Kribi', addStop: '+ Ajouter un arrêt',
    now: '⚡ Maintenant', schedule: '📅 Planifier', chooseRide: 'Choisissez un véhicule',
    bookNow: 'Réserver', confirmBook: 'Confirmer', payment: 'Paiement',
    searching: 'Recherche du chauffeur...', driverFound: 'Chauffeur trouvé !',
    arriving: 'Chauffeur arrive dans', minAway: 'min', liveTracking: 'Suivi en direct',
    tripDone: 'Course terminée !', rateTrip: 'Comment était votre course ?', submitRating: 'Soumettre',
    tapRate: 'Appuyez pour noter', recentTrips: 'Courses récentes', nearbyDrivers: 'Chauffeurs proches',
    myRewards: 'Mes Récompenses', loyaltySub: '10 courses = 1 gratuite !',
    ridesLeft: 'courses avant la gratuite', freeReady: '🎉 Course gratuite !',
    howWorks: 'Comment ça marche', totalRides: 'Courses totales', freeEarned: 'Gratuites gagnées',
    driverStatus: 'Statut Chauffeur', online: 'En ligne', offline: 'Hors ligne',
    goOnline: 'Passez en ligne pour recevoir des demandes', searchingRiders: 'Recherche de passagers...',
    newRequest: 'Nouvelle demande !', nearby: 'Proche', decline: 'Refuser', accept: 'Accepter',
    rewards: 'Récompenses', yourTier: 'Votre Niveau', allTiers: 'Tous les niveaux',
    bonuses: 'Bonus actifs', tripsToNext: 'courses avant le niveau suivant', atTop: 'Niveau maximum ! 💎',
    earnings: 'Gains', today: "Aujourd'hui", thisWeek: 'Cette semaine', thisMonth: 'Ce mois',
    weeklyGoal: 'Objectif Semaine', weeklyBonus: '+5,000 XAF pour 20 courses',
    payoutInfo: 'Paiement chaque vendredi via MTN MoMo',
    home: 'Accueil', history: 'Courses', profile: 'Profil', cancel: 'Annuler',
    back: 'Retour', save: 'Enregistrer', cash: 'Espèces', mtnMomo: 'MTN MoMo', orange: 'Orange',
    signOut: 'Se déconnecter', language: 'Langue : Français', fare: 'Tarif', km: 'km',
    distSim: 'Simulateur de distance', adjustFare: 'Ajustez pour voir le tarif',
    nightRates: '🌙 Tarifs de nuit actifs', dayRates: '☀️ Tarifs de jour',
  },
};
