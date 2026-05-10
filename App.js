import React, { useState, useEffect } from 'react';
import { persistLogin, loadSession, logout } from './src/services/auth';
import { connectSocket, joinAsRider, joinAsDriver, onNewRideRequest, offNewRideRequest, getSocket } from './src/services/socket';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform,
  ActivityIndicator, Alert, ScrollView, Modal
} from 'react-native';


const API = 'https://kribigo-backend.onrender.com/api/v1';

// ─── PRICING CONFIG ────────────────────────────────────────
const PRICING = {
  moto:     { base_day: 1000, base_night: 1500, per_km: 150 },
  economie: { base_day: 2000, base_night: 3000, per_km: 250 },
  confort:  { base_day: 2500, base_night: 3500, per_km: 350 },
};
const WAIT_RATE_PER_15MIN = 1000;
const NIGHT_START = 18;
const NIGHT_END = 6;
const MAX_STOPS = 4;
const KM_PER_STOP = 3;
// ──────────────────────────────────────────────────────────

const WAIT_OPTIONS = [
  { label: '15 min', value: 1 },
  { label: '30 min', value: 2 },
  { label: '45 min', value: 3 },
  { label: '1h',     value: 4 },
  { label: '1h30',   value: 6 },
  { label: '2h',     value: 8 },
];

const VEHICLES = [
  { id: 'moto',     icon: '🏍️', label_fr: 'Moto',    label_en: 'Moto',    desc_fr: 'Rapide & économique', desc_en: 'Fast & cheap' },
  { id: 'economie', icon: '🚗', label_fr: 'Économie', label_en: 'Economy', desc_fr: 'Voiture sans clim',   desc_en: 'Car without AC' },
  { id: 'confort',  icon: '❄️', label_fr: 'Confort',  label_en: 'Comfort', desc_fr: 'Voiture avec clim',   desc_en: 'Car with AC' },
];

const MONTHS_FR = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
const MONTHS_EN = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS_FR = ['Dim','Lun','Mar','Mer','Jeu','Ven','Sam'];
const DAYS_EN = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

function isNightAt(hour) { return hour >= NIGHT_START || hour < NIGHT_END; }
function calcFare({ type, isCourse, stops, waitUnits, scheduledHour }) {
  const p = PRICING[type];
  const hour = scheduledHour ?? new Date().getHours();
  const night = isNightAt(hour);
  const base = night ? p.base_night : p.base_day;
  if (!isCourse) return base + Math.round(KM_PER_STOP * p.per_km);
  const numLegs = Math.max(1, stops.filter(s => s.trim()).length);
  const distFare = base + Math.round(numLegs * KM_PER_STOP * p.per_km);
  const waitFare = (waitUnits||[]).reduce((sum,u) => sum + u * WAIT_RATE_PER_15MIN, 0);
  return distFare + waitFare;
}
function getDaysInMonth(y,m){return new Date(y,m+1,0).getDate();}
function getFirstDayOfMonth(y,m){return new Date(y,m,1).getDay();}
function formatDate(dateStr,lang){
  if(!dateStr)return '';
  const[y,m,d]=dateStr.split('-');
  const months=lang==='fr'?MONTHS_FR:MONTHS_EN;
  const date=new Date(parseInt(y),parseInt(m)-1,parseInt(d));
  const dayNames=lang==='fr'?['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi']:['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  return`${dayNames[date.getDay()]} ${d} ${months[parseInt(m)-1]}`;
}

function CalendarPicker({visible,onClose,onSelect,selectedDate,lang}){
  const today=new Date();
  const[viewYear,setViewYear]=useState(today.getFullYear());
  const[viewMonth,setViewMonth]=useState(today.getMonth());
  const months=lang==='fr'?MONTHS_FR:MONTHS_EN;
  const days=lang==='fr'?DAYS_FR:DAYS_EN;
  const daysInMonth=getDaysInMonth(viewYear,viewMonth);
  const firstDay=getFirstDayOfMonth(viewYear,viewMonth);
  const prevMonth=()=>{if(viewMonth===0){setViewMonth(11);setViewYear(viewYear-1);}else setViewMonth(viewMonth-1);};
  const nextMonth=()=>{if(viewMonth===11){setViewMonth(0);setViewYear(viewYear+1);}else setViewMonth(viewMonth+1);};
  const isToday=(d)=>d===today.getDate()&&viewMonth===today.getMonth()&&viewYear===today.getFullYear();
  const isPast=(d)=>new Date(viewYear,viewMonth,d)<new Date(today.getFullYear(),today.getMonth(),today.getDate());
  const isSelected=(d)=>{if(!selectedDate)return false;const sd=new Date(selectedDate);return d===sd.getDate()&&viewMonth===sd.getMonth()&&viewYear===sd.getFullYear();};
  const selectDay=(d)=>{if(isPast(d))return;const month=String(viewMonth+1).padStart(2,'0');const day=String(d).padStart(2,'0');onSelect(`${viewYear}-${month}-${day}`);onClose();};
  const cells=[];
  for(let i=0;i<firstDay;i++)cells.push(null);
  for(let d=1;d<=daysInMonth;d++)cells.push(d);
  return(
    <Modal visible={visible} transparent animationType="slide">
      <View style={cs.overlay}>
        <View style={cs.container}>
          <Text style={cs.title}>{lang==='fr'?'Choisir une date':'Choose a date'}</Text>
          <View style={cs.navRow}>
            <TouchableOpacity onPress={prevMonth} style={cs.navBtn}><Text style={cs.navArrow}>‹</Text></TouchableOpacity>
            <Text style={cs.monthLabel}>{months[viewMonth]} {viewYear}</Text>
            <TouchableOpacity onPress={nextMonth} style={cs.navBtn}><Text style={cs.navArrow}>›</Text></TouchableOpacity>
          </View>
          <View style={cs.daysRow}>{days.map(d=><Text key={d} style={cs.dayLabel}>{d}</Text>)}</View>
          <View style={cs.grid}>
            {cells.map((d,i)=>(
              <TouchableOpacity key={i} style={[cs.cell,d&&isSelected(d)&&cs.cellSelected,d&&isToday(d)&&!isSelected(d)&&cs.cellToday,d&&isPast(d)&&cs.cellPast]} onPress={()=>d&&selectDay(d)} disabled={!d||isPast(d)}>
                <Text style={[cs.cellText,d&&isSelected(d)&&cs.cellTextSelected,d&&isPast(d)&&cs.cellTextPast,d&&isToday(d)&&!isSelected(d)&&cs.cellTextToday]}>{d||''}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity style={cs.closeBtn} onPress={onClose}><Text style={cs.closeBtnText}>{lang==='fr'?'Fermer':'Close'}</Text></TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function TimePicker({visible,onClose,onSelect,selectedTime,lang}){
  const[hour,setHour]=useState(8);
  const[minute,setMinute]=useState(0);
  const hours=Array.from({length:24},(_,i)=>i);
  const minutes=[0,15,30,45];
  const confirm=()=>{onSelect(`${String(hour).padStart(2,'0')}:${String(minute).padStart(2,'0')}`);onClose();};
  const isNight=isNightAt(hour);
  return(
    <Modal visible={visible} transparent animationType="slide">
      <View style={cs.overlay}>
        <View style={cs.container}>
          <Text style={cs.title}>{lang==='fr'?'Choisir l\'heure':'Choose time'}</Text>
          <View style={[cs.timePreview,isNight&&cs.timePreviewNight]}>
            <Text style={[cs.timePreviewText,{color:isNight?'#a0a0ff':GREEN}]}>{String(hour).padStart(2,'0')}:{String(minute).padStart(2,'0')}</Text>
            <Text style={cs.timePreviewBadge}>{isNight?'🌙 Nuit':'☀️ Jour'}</Text>
          </View>
          <Text style={cs.timeLabel}>{lang==='fr'?'Heure':'Hour'}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={cs.hourScroll}>
            {hours.map(h=>(
              <TouchableOpacity key={h} style={[cs.hourBtn,hour===h&&cs.hourBtnActive]} onPress={()=>setHour(h)}>
                <Text style={[cs.hourText,hour===h&&cs.hourTextActive]}>{String(h).padStart(2,'0')}h</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <Text style={cs.timeLabel}>{lang==='fr'?'Minutes':'Minutes'}</Text>
          <View style={cs.minuteRow}>
            {minutes.map(m=>(
              <TouchableOpacity key={m} style={[cs.minuteBtn,minute===m&&cs.minuteBtnActive]} onPress={()=>setMinute(m)}>
                <Text style={[cs.minuteText,minute===m&&cs.minuteTextActive]}>{String(m).padStart(2,'0')}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity style={cs.confirmTimeBtn} onPress={confirm}>
            <Text style={cs.confirmTimeBtnText}>{lang==='fr'?`Confirmer — ${String(hour).padStart(2,'0')}:${String(minute).padStart(2,'0')}`:`Confirm — ${String(hour).padStart(2,'0')}:${String(minute).padStart(2,'0')}`}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={cs.closeBtn} onPress={onClose}><Text style={cs.closeBtnText}>{lang==='fr'?'Annuler':'Cancel'}</Text></TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ─── DRIVER HOME SCREEN ────────────────────────────────────
function DriverHome({phone, lang, onSwitchRole}){
  const fr = lang === 'fr';
  const [isOnline, setIsOnline] = useState(false);
  const [hasRequest, setHasRequest] = useState(false);

  // Simulate incoming request after going online
  const toggleOnline = () => {
    const next = !isOnline;
    setIsOnline(next);
    if (next) {
      setTimeout(() => setHasRequest(true), 3000);
    } else {
      setHasRequest(false);
    }
  };

  const todayEarnings = 11500;
  const todayTrips = 4;
  const rating = 4.9;

  return (
    <View style={s.container}>
      {/* Incoming request modal */}
      <Modal visible={hasRequest} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={dr.requestModal}>
            <View style={dr.requestHeader}>
              <Text style={dr.requestTitle}>{fr ? '🔔 Nouvelle demande !' : '🔔 New request!'}</Text>
              <Text style={dr.requestSub}>{fr ? 'Un passager attend votre réponse' : 'A rider is waiting for your response'}</Text>
            </View>
            <View style={dr.requestDetails}>
              <View style={dr.requestRow}>
                <Text style={dr.requestIcon}>📍</Text>
                <View>
                  <Text style={dr.requestLabel}>{fr ? 'Prise en charge' : 'Pickup'}</Text>
                  <Text style={dr.requestValue}>Centre Ville, Kribi</Text>
                </View>
              </View>
              <View style={dr.requestRow}>
                <Text style={dr.requestIcon}>🏁</Text>
                <View>
                  <Text style={dr.requestLabel}>{fr ? 'Destination' : 'Destination'}</Text>
                  <Text style={dr.requestValue}>Hôtel Ilomba Beach</Text>
                </View>
              </View>
              <View style={dr.requestRow}>
                <Text style={dr.requestIcon}>🚗</Text>
                <View>
                  <Text style={dr.requestLabel}>{fr ? 'Véhicule' : 'Vehicle'}</Text>
                  <Text style={dr.requestValue}>Économie • ~3 km</Text>
                </View>
              </View>
              <View style={dr.fareBadge}>
                <Text style={dr.fareBadgeText}>2 750 XAF</Text>
              </View>
            </View>
            <View style={dr.requestBtns}>
              <TouchableOpacity style={dr.declineBtn} onPress={() => setHasRequest(false)}>
                <Text style={dr.declineBtnText}>{fr ? 'Refuser' : 'Decline'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={dr.acceptBtn} onPress={() => { setHasRequest(false); Alert.alert('✅', fr ? 'Course acceptée ! Rendez-vous au point de départ.' : 'Ride accepted! Head to pickup point.'); }}>
                <Text style={dr.acceptBtnText}>{fr ? 'Accepter' : 'Accept'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Header */}
      <View style={dr.header}>
        <View>
          <Text style={s.homeGreeting}>{fr ? 'Mode Chauffeur 🚗' : 'Driver Mode 🚗'}</Text>
          <Text style={s.homeSubGreeting}>+237 {phone}</Text>
        </View>
        <TouchableOpacity onPress={onSwitchRole} style={dr.switchBtn}>
          <Text style={dr.switchBtnText}>{fr ? '👤 Passager' : '👤 Rider'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={s.homeScroll}>
        {/* Online toggle */}
        <TouchableOpacity style={[dr.onlineCard, isOnline && dr.onlineCardActive]} onPress={toggleOnline}>
          <View>
            <Text style={[dr.onlineTitle, isOnline && dr.onlineTitleActive]}>
              {isOnline ? (fr ? '🟢 En ligne' : '🟢 Online') : (fr ? '⚫ Hors ligne' : '⚫ Offline')}
            </Text>
            <Text style={[dr.onlineSub, isOnline && dr.onlineSubActive]}>
              {isOnline ? (fr ? 'Vous recevez des demandes' : 'You\'re receiving requests') : (fr ? 'Appuyez pour démarrer' : 'Tap to start')}
            </Text>
          </View>
          <View style={[dr.togglePill, isOnline && dr.togglePillActive]}>
            <View style={[dr.toggleDot, isOnline && dr.toggleDotActive]}/>
          </View>
        </TouchableOpacity>

        {isOnline && (
          <View style={dr.searchingBadge}>
            <Text style={dr.searchingText}>🔍 {fr ? 'Recherche de passagers...' : 'Searching for riders...'}</Text>
          </View>
        )}

        {/* Stats */}
        <Text style={s.sectionTitle}>{fr ? 'Aujourd\'hui' : 'Today'}</Text>
        <View style={dr.statsRow}>
          <View style={dr.statCard}>
            <Text style={dr.statValue}>{todayEarnings.toLocaleString()}</Text>
            <Text style={dr.statLabel}>XAF</Text>
          </View>
          <View style={dr.statCard}>
            <Text style={dr.statValue}>{todayTrips}</Text>
            <Text style={dr.statLabel}>{fr ? 'Courses' : 'Trips'}</Text>
          </View>
          <View style={dr.statCard}>
            <Text style={dr.statValue}>{rating}</Text>
            <Text style={dr.statLabel}>⭐ {fr ? 'Note' : 'Rating'}</Text>
          </View>
        </View>

        {/* Tier */}
        <View style={dr.tierCard}>
          <View style={dr.tierLeft}>
            <Text style={dr.tierIcon}>🥉</Text>
            <View>
              <Text style={dr.tierName}>Bronze</Text>
              <Text style={dr.tierSub}>{fr ? '15% commission • 67 courses' : '15% commission • 67 trips'}</Text>
            </View>
          </View>
          <View style={dr.tierProgress}>
            <Text style={dr.tierProgressText}>{fr ? '33 courses → Argent 🥈' : '33 trips → Silver 🥈'}</Text>
            <View style={dr.tierBar}>
              <View style={[dr.tierBarFill, {width: '67%'}]}/>
            </View>
          </View>
        </View>

        {/* Weekly earnings */}
        <View style={dr.weekCard}>
          <Text style={dr.weekTitle}>{fr ? '📊 Cette semaine' : '📊 This week'}</Text>
          <View style={dr.weekRow}>
            {['L','M','M','J','V','S','D'].map((day,i) => (
              <View key={i} style={dr.weekDay}>
                <View style={[dr.weekBar, {height: [40,65,30,80,55,90,20][i], backgroundColor: i===4?GREEN:'#C8E6C9'}]}/>
                <Text style={dr.weekDayLabel}>{day}</Text>
              </View>
            ))}
          </View>
          <Text style={dr.weekTotal}>{fr ? 'Total: 54 200 XAF' : 'Total: 54,200 XAF'}</Text>
        </View>

        <View style={{height:40}}/>
      </ScrollView>
    </View>
  );
}

// ─── ROLE SELECTOR ─────────────────────────────────────────
function RoleSelector({phone, lang, onSelect}){
  const fr = lang === 'fr';
  return (
    <View style={s.container}>
      <ScrollView contentContainerStyle={role.scroll}>
        <View style={role.logoArea}>
          <Text style={s.logo}>Kribi<Text style={s.logoOrange}>Go</Text></Text>
          <Text style={s.flag}>🇨🇲</Text>
        </View>
        <Text style={role.title}>{fr ? 'Comment voulez-vous\nutiliser KribiGo ?' : 'How do you want\nto use KribiGo?'}</Text>
        <Text style={role.sub}>{fr ? 'Vous pourrez changer à tout moment' : 'You can switch anytime'}</Text>

        <TouchableOpacity style={role.card} onPress={() => onSelect('rider')}>
          <Text style={role.cardIcon}>🧑‍💼</Text>
          <View style={role.cardInfo}>
            <Text style={role.cardTitle}>{fr ? 'Je suis passager' : 'I\'m a rider'}</Text>
            <Text style={role.cardDesc}>{fr ? 'Commander des courses, planifier mes trajets' : 'Book rides, schedule trips'}</Text>
          </View>
          <Text style={role.cardArrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[role.card, role.cardDriver]} onPress={() => onSelect('driver')}>
          <Text style={role.cardIcon}>🚗</Text>
          <View style={role.cardInfo}>
            <Text style={[role.cardTitle, {color: '#fff'}]}>{fr ? 'Je suis chauffeur' : 'I\'m a driver'}</Text>
            <Text style={[role.cardDesc, {color: 'rgba(255,255,255,0.75)'}]}>{fr ? 'Recevoir des courses, gérer mes gains' : 'Receive rides, manage earnings'}</Text>
          </View>
          <Text style={[role.cardArrow, {color: '#fff'}]}>›</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

// ─── MAIN APP ──────────────────────────────────────────────
export default function App() {
  const [screen, setScreen] = useState('loading');
  const [savedPhone, setSavedPhone] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [lang, setLang] = useState('fr');
  const [userRole, setUserRole] = useState(null);
  const [token, setToken] = useState(null);

  useEffect(() => {
    loadSession().then(session => {
      if (session) {
        setPhone(session.phone);
        setUserRole(session.role);
        setScreen('home');
      } else {
        setScreen('login');
      }
    });
  }, []);

  const handleRoleSelect = async (r) => {
    await persistLogin(token, phone, r);
    setUserRole(r);
    setScreen('home');
  };

  // Listen for driver en route (rider mode)
  useEffect(() => {
    if (userRole !== 'rider') return;
    const s = connectSocket();
    s.on('trip:driver_en_route', ({ trip_id, eta_minutes, driver }) => {
      console.log('🚗 Driver en route!', eta_minutes);
      setTripStatus('arriving');
      setDriverInfo({ eta_minutes, ...driver });
    });
    return () => s.off('trip:driver_en_route');
  }, [userRole]);

  // Listen for incoming ride requests (driver mode)
  useEffect(() => {
    if (userRole !== 'driver') return;
    const s = connectSocket();
    onNewRideRequest((tripData) => {
      console.log('🚗 New ride request:', tripData);
      setLiveRequest(tripData);
    });
    return () => offNewRideRequest();
  }, [userRole]);

  const handleLogout = async () => {
    await logout();
    setScreen('login');
    setUserRole(null);
    setPhone('');
  };

  const [rideMode, setRideMode] = useState('now');
  const [destination, setDestination] = useState('');
  const [selectedVehicle, setSelectedVehicle] = useState('moto');
  const [isCourse, setIsCourse] = useState(false);
  const [stops, setStops] = useState(['','']);
  const [waitUnits, setWaitUnits] = useState([0,0,0,0]);
  const [showWaitPicker, setShowWaitPicker] = useState(null);
  const [schedDate, setSchedDate] = useState('');
  const [schedTime, setSchedTime] = useState('');
  const [showCalendar, setShowCalendar] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [bookedRide, setBookedRide] = useState(null);
  const [tripStatus, setTripStatus] = useState('searching'); // searching | accepted | arriving | in_progress | completed
  const [driverInfo, setDriverInfo] = useState(null);

  const fr = lang === 'fr';
  const schedHour = schedTime ? parseInt(schedTime.split(':')[0]) : null;
  const night = schedHour !== null ? isNightAt(schedHour) : isNightAt(new Date().getHours());
  const fare = calcFare({type:selectedVehicle,isCourse,stops:isCourse?stops:[destination],waitUnits,scheduledHour:schedHour});
  const totalWaitFare = waitUnits.reduce((s,u)=>s+u*WAIT_RATE_PER_15MIN,0);
  const vehicle = VEHICLES.find(v=>v.id===selectedVehicle);
  const canBook = isCourse?stops.some(s=>s.trim()):destination.trim().length>0;
  const canBookScheduled = canBook&&(rideMode==='now'||(schedDate&&schedTime));

  const requestOTP = async () => {
    if (!phone){Alert.alert('Erreur','Entrez votre numéro');return;}
    setLoading(true);
    try {
      const res = await fetch(`${API}/auth/user/request-otp`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({phone})});
      if(res.ok)setScreen('otp');
      else Alert.alert('Erreur','Impossible d\'envoyer le code');
    } catch {Alert.alert('Erreur','Serveur inaccessible');}
    finally{setLoading(false);}
  };

  const verifyOTP = async () => {
    if(!otp){Alert.alert('Erreur','Entrez le code');return;}
    setLoading(true);
    try {
      const res = await fetch(`${API}/auth/user/verify-otp`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({phone,code:otp})});
      const data = await res.json();
      if(res.ok){ setToken(data.access_token); setScreen('role'); }
      else Alert.alert('Erreur',data.error||'Code invalide');
    } catch {Alert.alert('Erreur','Serveur inaccessible');}
    finally{setLoading(false);}
  };

  const confirmBooking = () => {
    setBookedRide({vehicle,destination:isCourse?stops.filter(s=>s.trim()).join(' → '):destination,fare,isCourse,isScheduled:rideMode==='later',schedDate,schedTime,night});
    setShowConfirm(false);
    setShowSuccess(true);
    // Join rider socket room so we receive driver updates
    const s = connectSocket();
    const userId = '329dfbe5-f621-4b4f-ba02-05d0858b96f4'; // TODO: use real user ID from token
    joinAsRider(userId);
    console.log('👤 Joined rider room:', userId);
  };

  const newRide = () => {
    setShowSuccess(false);setDestination('');setStops(['','']);
    setWaitUnits([0,0,0,0]);setIsCourse(false);setRideMode('now');
    setSchedDate('');setSchedTime('');
  };

  const LangToggle = () => (
    <View style={s.langRow}>
      {['fr','en'].map(l=>(
        <TouchableOpacity key={l} onPress={()=>setLang(l)} style={[s.langBtn,lang===l&&s.langActive]}>
          <Text style={[s.langText,lang===l&&s.langTextActive]}>{l.toUpperCase()}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  if(screen==='loading') return(
    <View style={[s.container,{justifyContent:'center',alignItems:'center'}]}>
      <Text style={s.logo}>Kribi<Text style={s.logoOrange}>Go</Text></Text>
      <ActivityIndicator color="#fff" style={{marginTop:20}}/>
    </View>
  );

  if(screen==='login') return(
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS==='ios'?'padding':'height'}>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        <LangToggle/>
        <View style={s.logoArea}><Text style={s.logo}>Kribi<Text style={s.logoOrange}>Go</Text></Text><Text style={s.flag}>🇨🇲</Text></View>
        <View style={s.card}>
          <Text style={s.cardTitle}>{fr?'Bienvenue':'Welcome'}</Text>
          <Text style={s.cardSub}>{fr?'Entrez votre numéro pour continuer':'Enter your number to continue'}</Text>
          <View style={s.phoneRow}>
            <View style={s.prefix}><Text style={s.prefixText}>🇨🇲 +237</Text></View>
            <TextInput style={s.phoneInput} placeholder={fr?'Numéro de téléphone':'Phone number'} placeholderTextColor="#999" value={phone} onChangeText={setPhone} keyboardType="phone-pad" maxLength={9}/>
          </View>
          <TouchableOpacity style={[s.btn,loading&&s.btnOff]} onPress={requestOTP} disabled={loading}>
            {loading?<ActivityIndicator color="#fff"/>:<Text style={s.btnText}>{fr?'Recevoir le code':'Get code'}</Text>}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );

  if(screen==='otp') return(
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS==='ios'?'padding':'height'}>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        <LangToggle/>
        <View style={s.logoArea}><Text style={s.logo}>Kribi<Text style={s.logoOrange}>Go</Text></Text><Text style={s.flag}>🇨🇲</Text></View>
        <View style={s.card}>
          <Text style={s.cardTitle}>{fr?'Code de vérification':'Verification code'}</Text>
          <Text style={s.cardSub}>{fr?`Code envoyé au +237 ${phone}`:`Code sent to +237 ${phone}`}</Text>
          <TextInput style={[s.input,s.otpInput]} placeholder="· · · · · ·" placeholderTextColor="#ccc" value={otp} onChangeText={setOtp} keyboardType="number-pad" maxLength={6}/>
          <TouchableOpacity style={[s.btn,loading&&s.btnOff]} onPress={verifyOTP} disabled={loading}>
            {loading?<ActivityIndicator color="#fff"/>:<Text style={s.btnText}>{fr?'Vérifier':'Verify'}</Text>}
          </TouchableOpacity>
          <TouchableOpacity onPress={()=>{setScreen('login');setOtp('');}} style={s.changeBtn}>
            <Text style={s.changeText}>{fr?'Changer de numéro':'Change number'}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );

  if(screen==='role') return <RoleSelector phone={phone} lang={lang} onSelect={handleRoleSelect}/>;

  if(userRole==='driver') return <DriverHome phone={phone} lang={lang} onSwitchRole={()=>setUserRole('rider')}/>;

  if(showSuccess&&bookedRide) return(
    <View style={s.container}>
      <ScrollView contentContainerStyle={s.successScroll}>
        {tripStatus === 'searching' && (
          <View style={tk.statusCard}>
            <Text style={tk.statusIcon}>🔍</Text>
            <Text style={tk.statusTitle}>{fr ? 'Recherche chauffeur...' : 'Finding driver...'}</Text>
            <Text style={tk.statusSub}>{fr ? 'Nous trouvons le meilleur chauffeur' : 'Finding best driver near you'}</Text>
            <ActivityIndicator color="#1B6B4A" style={{marginTop:12}}/>
          </View>
        )}
        {tripStatus === 'arriving' && (
          <View style={[tk.statusCard, tk.statusCardGreen]}>
            <Text style={tk.statusIcon}>🚗</Text>
            <Text style={[tk.statusTitle,{color:'#fff'}]}>{fr ? 'Chauffeur trouvé !' : 'Driver found!'}</Text>
            <Text style={[tk.statusSub,{color:'rgba(255,255,255,0.85)'}]}>{fr ? 'En route vers vous' : 'On the way to you'}</Text>
          </View>
        )}
        {tripStatus === 'in_progress' && (
          <View style={[tk.statusCard, {backgroundColor:'#1a1a2e'}]}>
            <Text style={tk.statusIcon}>🏎️</Text>
            <Text style={[tk.statusTitle,{color:'#fff'}]}>{fr ? 'En course !' : 'Ride in progress!'}</Text>
            <Text style={[tk.statusSub,{color:'rgba(255,255,255,0.85)'}]}>{fr ? 'Bon voyage !' : 'Enjoy your ride!'}</Text>
          </View>
        )}
        {tripStatus === 'completed' && (
          <View style={[tk.statusCard, tk.statusCardGreen]}>
            <Text style={tk.statusIcon}>✅</Text>
            <Text style={[tk.statusTitle,{color:'#fff'}]}>{fr ? 'Course terminée !' : 'Ride complete!'}</Text>
            <Text style={[tk.statusSub,{color:'rgba(255,255,255,0.85)'}]}>{fr ? 'Merci d\'avoir utilisé KribiGo' : 'Thanks for using KribiGo'}</Text>
          </View>
        )}
        <View style={tk.stepsCard}>
          {[
            {key:'searching', icon:'🔍', fr:'Recherche',  en:'Searching'},
            {key:'arriving',  icon:'🚗', fr:'En route',   en:'On the way'},
            {key:'in_progress',icon:'🏎️',fr:'En course',  en:'In progress'},
            {key:'completed', icon:'✅', fr:'Terminée',   en:'Completed'},
          ].map((step,i,arr)=>{
            const steps=['searching','arriving','in_progress','completed'];
            const currentIdx=steps.indexOf(tripStatus);
            const stepIdx=steps.indexOf(step.key);
            const done=stepIdx<currentIdx;
            const active=stepIdx===currentIdx;
            return(
              <View key={step.key}>
                <View style={tk.stepRow}>
                  <View style={[tk.stepDot,done&&tk.stepDotDone,active&&tk.stepDotActive]}>
                    <Text style={tk.stepDotText}>{done?'✓':step.icon}</Text>
                  </View>
                  <Text style={[tk.stepLabel,active&&tk.stepLabelActive,done&&tk.stepLabelDone]}>{fr?step.fr:step.en}</Text>
                </View>
                {i<arr.length-1&&<View style={[tk.stepLine,done&&tk.stepLineDone]}/>}
              </View>
            );
          })}
        </View>
        {(tripStatus==='arriving'||tripStatus==='in_progress')&&(
          <View style={tk.driverCard}>
            <View style={tk.driverAvatar}><Text style={{fontSize:32}}>👨‍✈️</Text></View>
            <View style={tk.driverInfo}>
              <Text style={tk.driverName}>{driverInfo?.name||'Chauffeur KribiGo'}</Text>
              <Text style={tk.driverRating}>⭐ {driverInfo?.rating||'4.9'} • {bookedRide.vehicle.icon} {fr?bookedRide.vehicle.label_fr:bookedRide.vehicle.label_en}</Text>
            </View>
            <View style={tk.driverEta}>
              <Text style={tk.driverEtaNum}>{driverInfo?.eta_minutes||5}</Text>
              <Text style={tk.driverEtaLabel}>min</Text>
            </View>
          </View>
        )}
        <View style={s.successCard}>
          <View style={s.successRow}><Text style={s.successLabel}>{fr?'Destination':'Destination'}</Text><Text style={s.successValue} numberOfLines={2}>{bookedRide.destination}</Text></View>
          <View style={s.successRow}><Text style={s.successLabel}>{fr?'Véhicule':'Vehicle'}</Text><Text style={s.successValue}>{bookedRide.vehicle.icon} {fr?bookedRide.vehicle.label_fr:bookedRide.vehicle.label_en}</Text></View>
          <View style={s.successRow}><Text style={s.successLabel}>{fr?'Tarif estimé':'Est. fare'}</Text><Text style={[s.successValue,{color:'#1B6B4A',fontWeight:'800'}]}>{bookedRide.fare.toLocaleString()} XAF</Text></View>
          {bookedRide.night&&<View style={s.nightBadge}><Text style={s.nightBadgeText}>🌙 {fr?'Tarif nuit':'Night rate'}</Text></View>}
        </View>
        {tripStatus==='completed'?(
          <TouchableOpacity style={s.newRideBtn} onPress={()=>{newRide();setTripStatus('searching');setDriverInfo(null);}}>
            <Text style={s.newRideBtnText}>{fr?'+ Nouvelle course':'+ New ride'}</Text>
          </TouchableOpacity>
        ):tripStatus==='searching'?(
          <TouchableOpacity style={[s.newRideBtn,{backgroundColor:'rgba(255,255,255,0.1)'}]} onPress={()=>{newRide();setTripStatus('searching');}}>
            <Text style={s.newRideBtnText}>{fr?'Annuler':'Cancel'}</Text>
          </TouchableOpacity>
        ):null}
        <View style={{height:40}}/>
      </ScrollView>
    </View>
  );

  return(
    <View style={s.container}>
      <CalendarPicker visible={showCalendar} onClose={()=>setShowCalendar(false)} onSelect={setSchedDate} selectedDate={schedDate} lang={lang}/>
      <TimePicker visible={showTimePicker} onClose={()=>setShowTimePicker(false)} onSelect={setSchedTime} selectedTime={schedTime} lang={lang}/>

      {showWaitPicker!==null&&(
        <View style={s.modalOverlay}>
          <View style={s.modal}>
            <Text style={s.modalTitle}>{fr?`Attente à l'arrêt ${showWaitPicker+1}`:`Wait at stop ${showWaitPicker+1}`}</Text>
            <Text style={s.modalSub}>{fr?'1 000 XAF par 15 minutes':'1,000 XAF per 15 minutes'}</Text>
            <TouchableOpacity style={s.modalNoWait} onPress={()=>{const w=[...waitUnits];w[showWaitPicker]=0;setWaitUnits(w);setShowWaitPicker(null);}}>
              <Text style={s.modalNoWaitText}>{fr?'Pas d\'attente':'No wait'}</Text>
            </TouchableOpacity>
            {WAIT_OPTIONS.map(opt=>(
              <TouchableOpacity key={opt.value} style={[s.waitOption,waitUnits[showWaitPicker]===opt.value&&s.waitOptionActive]}
                onPress={()=>{const w=[...waitUnits];w[showWaitPicker]=opt.value;setWaitUnits(w);setShowWaitPicker(null);}}>
                <Text style={[s.waitOptionText,waitUnits[showWaitPicker]===opt.value&&s.waitOptionTextActive]}>{opt.label}</Text>
                <Text style={[s.waitOptionFare,waitUnits[showWaitPicker]===opt.value&&s.waitOptionTextActive]}>+{(opt.value*WAIT_RATE_PER_15MIN).toLocaleString()} XAF</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={s.modalClose} onPress={()=>setShowWaitPicker(null)}><Text style={s.modalCloseText}>{fr?'Fermer':'Close'}</Text></TouchableOpacity>
          </View>
        </View>
      )}

      <Modal visible={showConfirm} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.confirmModal}>
            <Text style={s.confirmTitle}>{fr?'Confirmer la réservation':'Confirm booking'}</Text>
            <View style={s.confirmDetails}>
              <View style={s.confirmRow}><Text style={s.confirmLabel}>{fr?'Véhicule':'Vehicle'}</Text><Text style={s.confirmValue}>{vehicle?.icon} {fr?vehicle?.label_fr:vehicle?.label_en}</Text></View>
              <View style={s.confirmRow}><Text style={s.confirmLabel}>{fr?'Destination':'Destination'}</Text><Text style={s.confirmValue} numberOfLines={2}>{isCourse?stops.filter(s=>s.trim()).join(' → '):destination}</Text></View>
              {rideMode==='later'&&schedDate&&<View style={s.confirmRow}><Text style={s.confirmLabel}>{fr?'Date':'Date'}</Text><Text style={s.confirmValue}>{formatDate(schedDate,lang)}</Text></View>}
              {rideMode==='later'&&schedTime&&<View style={s.confirmRow}><Text style={s.confirmLabel}>{fr?'Heure':'Time'}</Text><Text style={s.confirmValue}>{schedTime}</Text></View>}
              {isCourse&&totalWaitFare>0&&<View style={s.confirmRow}><Text style={s.confirmLabel}>{fr?'Attente':'Wait'}</Text><Text style={s.confirmValue}>+{totalWaitFare.toLocaleString()} XAF</Text></View>}
              <View style={[s.confirmRow,s.confirmTotalRow]}><Text style={s.confirmTotalLabel}>{fr?'Total estimé':'Est. total'}</Text><Text style={s.confirmTotalValue}>{fare.toLocaleString()} XAF</Text></View>
              {night&&<View style={s.nightBadge}><Text style={s.nightBadgeText}>🌙 {fr?'Tarif nuit appliqué':'Night rate applied'}</Text></View>}
            </View>
            {rideMode==='later'&&<View style={s.reminderBox}><Text style={{fontSize:20,marginRight:10}}>🔔</Text><Text style={s.reminderSub}>{fr?'Rappel 30 min avant votre course':'Reminder 30 min before your ride'}</Text></View>}
            <TouchableOpacity style={s.confirmBtn} onPress={confirmBooking}>
              <Text style={s.confirmBtnText}>{rideMode==='later'?(fr?'📅 Planifier la course':'📅 Schedule ride'):(fr?'🚗 Commander maintenant':'🚗 Book now')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.cancelBtn} onPress={()=>setShowConfirm(false)}><Text style={s.cancelBtnText}>{fr?'Annuler':'Cancel'}</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>

      <View style={s.homeHeader}>
        <View>
          <Text style={s.homeGreeting}>{fr?'Bonjour 👋':'Hello 👋'}</Text>
          <Text style={s.homeSubGreeting}>{fr?'Où allez-vous ?':'Where to?'}</Text>
        </View>
        <View style={{flexDirection:'row',alignItems:'center',gap:8}}>
          <TouchableOpacity onPress={()=>setUserRole('driver')} style={dr.switchBtn}>
            <Text style={dr.switchBtnText}>{fr?'🚗 Chauffeur':'🚗 Driver'}</Text>
          </TouchableOpacity>
          <View style={[s.timeBadge,night&&s.timeBadgeNight]}>
            <Text style={s.timeBadgeText}>{night?'🌙 Nuit':'☀️ Jour'}</Text>
          </View>
        </View>
      </View>

      <ScrollView style={s.homeScroll} keyboardShouldPersistTaps="handled">
        <View style={s.rideTypeRow}>
          <TouchableOpacity style={[s.rideTypeBtn,rideMode==='now'&&s.rideTypeBtnActive]} onPress={()=>setRideMode('now')}>
            <Text style={[s.rideTypeText,rideMode==='now'&&s.rideTypeTextActive]}>⚡ {fr?'Maintenant':'Now'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.rideTypeBtn,rideMode==='later'&&s.rideTypeBtnActive]} onPress={()=>setRideMode('later')}>
            <Text style={[s.rideTypeText,rideMode==='later'&&s.rideTypeTextActive]}>📅 {fr?'Planifier':'Schedule'}</Text>
          </TouchableOpacity>
        </View>

        {rideMode==='later'&&(
          <View style={s.schedCard}>
            <Text style={s.destLabel}>📅 {fr?'Date et heure de la course':'Ride date and time'}</Text>
            <View style={s.schedRow}>
              <TouchableOpacity style={s.schedPickerBtn} onPress={()=>setShowCalendar(true)}>
                <Text style={s.schedPickerIcon}>📅</Text>
                <Text style={[s.schedPickerText,!schedDate&&s.schedPickerPlaceholder]}>{schedDate?formatDate(schedDate,lang):(fr?'Choisir une date':'Choose date')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.schedPickerBtn} onPress={()=>setShowTimePicker(true)}>
                <Text style={s.schedPickerIcon}>🕐</Text>
                <Text style={[s.schedPickerText,!schedTime&&s.schedPickerPlaceholder]}>{schedTime||(fr?'Choisir l\'heure':'Choose time')}</Text>
              </TouchableOpacity>
            </View>
            {schedTime&&schedHour!==null&&(
              <View style={[s.schedNightBadge,isNightAt(schedHour)?s.schedNightActive:s.schedDayActive]}>
                <Text style={[s.schedNightText,{color:isNightAt(schedHour)?'#a0a0ff':'#7A5200'}]}>
                  {isNightAt(schedHour)?(fr?'🌙 Tarif nuit sera appliqué':'🌙 Night rate will apply'):(fr?'☀️ Tarif jour sera appliqué':'☀️ Day rate will apply')}
                </Text>
              </View>
            )}
          </View>
        )}

        <View style={s.rideTypeRow}>
          <TouchableOpacity style={[s.rideTypeBtn,!isCourse&&s.rideTypeBtnActive]} onPress={()=>setIsCourse(false)}>
            <Text style={[s.rideTypeText,!isCourse&&s.rideTypeTextActive]}>📍 {fr?'Trajet simple':'Single ride'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.rideTypeBtn,isCourse&&s.rideTypeBtnActive]} onPress={()=>setIsCourse(true)}>
            <Text style={[s.rideTypeText,isCourse&&s.rideTypeTextActive]}>🔄 {fr?'Course':'Multi-stop'}</Text>
          </TouchableOpacity>
        </View>

        <View style={s.destCard}>
          {!isCourse?(
            <>
              <Text style={s.destLabel}>📍 {fr?'Destination':'Destination'}</Text>
              <TextInput style={s.destInput} placeholder={fr?'Entrez votre destination...':'Enter destination...'} placeholderTextColor="#999" value={destination} onChangeText={setDestination}/>
            </>
          ):(
            <>
              <Text style={s.destLabel}>🔄 {fr?'Arrêts de la course':'Course stops'}</Text>
              {stops.map((stop,i)=>(
                <View key={i}>
                  <View style={s.stopRow}>
                    <View style={s.stopBadge}><Text style={s.stopBadgeText}>{i+1}</Text></View>
                    <TextInput style={s.stopInput}
                      placeholder={i===0?(fr?'Premier arrêt...':'First stop...'):i===stops.length-1?(fr?'Dernier arrêt...':'Last stop...'):(fr?`Arrêt ${i+1}...`:`Stop ${i+1}...`)}
                      placeholderTextColor="#999" value={stop} onChangeText={v=>{const ns=[...stops];ns[i]=v;setStops(ns);}}/>
                    {stops.length>2&&<TouchableOpacity onPress={()=>setStops(stops.filter((_,idx)=>idx!==i))} style={s.removeBtn}><Text style={s.removeBtnText}>✕</Text></TouchableOpacity>}
                  </View>
                  {i<stops.length-1&&(
                    <TouchableOpacity style={s.waitRow} onPress={()=>setShowWaitPicker(i)}>
                      <Text style={s.waitIcon}>⏱️</Text>
                      <Text style={s.waitText}>{waitUnits[i]===0?(fr?'Ajouter temps d\'attente':'Add wait time'):`${WAIT_OPTIONS.find(o=>o.value===waitUnits[i])?.label} • +${(waitUnits[i]*WAIT_RATE_PER_15MIN).toLocaleString()} XAF`}</Text>
                      <Text style={s.waitChevron}>›</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))}
              {stops.length<MAX_STOPS&&<TouchableOpacity style={s.addStopBtn} onPress={()=>setStops([...stops,''])}><Text style={s.addStopText}>+ {fr?`Ajouter un arrêt (max ${MAX_STOPS})`:`Add stop (max ${MAX_STOPS})`}</Text></TouchableOpacity>}
              {totalWaitFare>0&&(
                <View style={s.fareBreakdown}>
                  <View style={s.fareRow}><Text style={s.fareLabel}>{fr?'Distance estimée':'Est. distance'}</Text><Text style={s.fareValue}>{(fare-totalWaitFare).toLocaleString()} XAF</Text></View>
                  <View style={s.fareRow}><Text style={s.fareLabel}>{fr?'Temps d\'attente':'Wait time'}</Text><Text style={s.fareValue}>+{totalWaitFare.toLocaleString()} XAF</Text></View>
                  <View style={[s.fareRow,s.fareTotalRow]}><Text style={s.fareTotalLabel}>{fr?'Total estimé':'Est. total'}</Text><Text style={s.fareTotalValue}>{fare.toLocaleString()} XAF</Text></View>
                </View>
              )}
            </>
          )}
        </View>

        <Text style={s.sectionTitle}>{fr?'Choisissez votre véhicule':'Choose your vehicle'}</Text>
        {VEHICLES.map(v=>{
          const vFare=calcFare({type:v.id,isCourse,stops:isCourse?stops:[destination],waitUnits,scheduledHour:schedHour});
          const selected=selectedVehicle===v.id;
          return(
            <TouchableOpacity key={v.id} style={[s.vehicleCard,selected&&s.vehicleCardSelected]} onPress={()=>setSelectedVehicle(v.id)}>
              <Text style={s.vehicleIcon}>{v.icon}</Text>
              <View style={s.vehicleInfo}>
                <Text style={[s.vehicleName,selected&&s.vehicleNameSelected]}>{fr?v.label_fr:v.label_en}</Text>
                <Text style={s.vehicleDesc}>{fr?v.desc_fr:v.desc_en}</Text>
              </View>
              <View style={s.vehicleFare}>
                <Text style={[s.vehicleFareAmt,selected&&s.vehicleFareSelected]}>{vFare.toLocaleString()} XAF</Text>
                <Text style={s.vehicleFareNote}>{fr?'estimé':'est.'}</Text>
              </View>
              {selected&&<View style={s.dot}/>}
            </TouchableOpacity>
          );
        })}

        {night&&<View style={s.nightNotice}><Text style={s.nightNoticeText}>🌙 {fr?(rideMode==='later'?'Tarif nuit prévu (18h–6h)':'Tarif nuit appliqué (18h–6h)'):(rideMode==='later'?'Night rate will apply':'Night rate applied')}</Text></View>}

        <TouchableOpacity style={[s.bookBtn,!canBookScheduled&&s.bookBtnOff]} disabled={!canBookScheduled} onPress={()=>setShowConfirm(true)}>
          <Text style={s.bookBtnText}>{rideMode==='later'?(fr?`📅 Planifier • ${fare.toLocaleString()} XAF`:`📅 Schedule • ${fare.toLocaleString()} XAF`):(fr?`Commander • ${fare.toLocaleString()} XAF`:`Book • ${fare.toLocaleString()} XAF`)}</Text>
        </TouchableOpacity>
        <View style={{height:50}}/>
      </ScrollView>
    </View>
  );
}

const GREEN='#1B6B4A', ORANGE='#F4A827';

const tk = StyleSheet.create({
  statusCard:{backgroundColor:'#fff',marginHorizontal:16,marginTop:16,borderRadius:20,padding:24,alignItems:'center',shadowColor:'#000',shadowOpacity:0.08,shadowRadius:12,elevation:4},
  statusCardGreen:{backgroundColor:'#1B6B4A'},
  statusIcon:{fontSize:48,marginBottom:12},
  statusTitle:{fontSize:22,fontWeight:'900',color:'#333',textAlign:'center',marginBottom:4},
  statusSub:{fontSize:14,color:'#888',textAlign:'center'},
  stepsCard:{backgroundColor:'#fff',marginHorizontal:16,marginTop:12,borderRadius:20,padding:20,shadowColor:'#000',shadowOpacity:0.06,shadowRadius:10,elevation:3},
  stepRow:{flexDirection:'row',alignItems:'center',marginBottom:4},
  stepDot:{width:36,height:36,borderRadius:18,backgroundColor:'#E0E0E0',alignItems:'center',justifyContent:'center',marginRight:12},
  stepDotActive:{backgroundColor:'#1B6B4A'},
  stepDotDone:{backgroundColor:'#C8E6C9'},
  stepDotText:{fontSize:16},
  stepLabel:{fontSize:14,color:'#999',flex:1},
  stepLabelActive:{color:'#1B6B4A',fontWeight:'800'},
  stepLabelDone:{color:'#888'},
  stepLine:{width:2,height:16,backgroundColor:'#E0E0E0',marginLeft:17,marginBottom:4},
  stepLineDone:{backgroundColor:'#1B6B4A'},
  driverCard:{backgroundColor:'#fff',marginHorizontal:16,marginTop:12,borderRadius:20,padding:20,flexDirection:'row',alignItems:'center',shadowColor:'#000',shadowOpacity:0.06,shadowRadius:10,elevation:3},
  driverAvatar:{width:56,height:56,borderRadius:28,backgroundColor:'#F0F7F4',alignItems:'center',justifyContent:'center',marginRight:14},
  driverInfo:{flex:1},
  driverName:{fontSize:16,fontWeight:'800',color:'#333'},
  driverRating:{fontSize:13,color:'#888',marginTop:4},
  driverEta:{alignItems:'center',backgroundColor:'#F0F7F4',borderRadius:12,padding:10,minWidth:52},
  driverEtaNum:{fontSize:22,fontWeight:'900',color:'#1B6B4A'},
  driverEtaLabel:{fontSize:11,color:'#888'},
});


const role = StyleSheet.create({
  scroll:{flexGrow:1,justifyContent:'center',padding:24,paddingTop:60},
  logoArea:{alignItems:'center',marginBottom:32},
  title:{fontSize:26,fontWeight:'900',color:'#fff',textAlign:'center',marginBottom:8,lineHeight:34},
  sub:{fontSize:14,color:'rgba(255,255,255,0.7)',textAlign:'center',marginBottom:32},
  card:{backgroundColor:'#fff',borderRadius:20,padding:20,flexDirection:'row',alignItems:'center',marginBottom:14,shadowColor:'#000',shadowOpacity:0.08,shadowRadius:10,elevation:3},
  cardDriver:{backgroundColor:GREEN},
  cardIcon:{fontSize:36,marginRight:16},
  cardInfo:{flex:1},
  cardTitle:{fontSize:17,fontWeight:'800',color:'#333',marginBottom:4},
  cardDesc:{fontSize:13,color:'#888'},
  cardArrow:{fontSize:24,color:'#ccc',fontWeight:'300'},
});

const dr = StyleSheet.create({
  header:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',padding:24,paddingTop:60},
  switchBtn:{backgroundColor:'rgba(255,255,255,0.2)',borderRadius:20,paddingHorizontal:14,paddingVertical:8,borderWidth:1,borderColor:'rgba(255,255,255,0.3)'},
  switchBtnText:{color:'#fff',fontWeight:'700',fontSize:13},
  onlineCard:{backgroundColor:'#fff',marginHorizontal:16,marginTop:12,borderRadius:20,padding:20,flexDirection:'row',alignItems:'center',justifyContent:'space-between',shadowColor:'#000',shadowOpacity:0.06,shadowRadius:10,elevation:3},
  onlineCardActive:{backgroundColor:GREEN},
  onlineTitle:{fontSize:18,fontWeight:'800',color:'#333'},
  onlineTitleActive:{color:'#fff'},
  onlineSub:{fontSize:13,color:'#888',marginTop:4},
  onlineSubActive:{color:'rgba(255,255,255,0.8)'},
  togglePill:{width:52,height:30,borderRadius:15,backgroundColor:'#ddd',justifyContent:'center',padding:3},
  togglePillActive:{backgroundColor:'rgba(255,255,255,0.3)'},
  toggleDot:{width:24,height:24,borderRadius:12,backgroundColor:'#999'},
  toggleDotActive:{backgroundColor:'#fff',alignSelf:'flex-end'},
  searchingBadge:{backgroundColor:'rgba(255,255,255,0.15)',marginHorizontal:16,marginTop:8,borderRadius:12,padding:12,alignItems:'center'},
  searchingText:{color:'#fff',fontWeight:'600',fontSize:14},
  statsRow:{flexDirection:'row',marginHorizontal:16,gap:10,marginBottom:12},
  statCard:{flex:1,backgroundColor:'#fff',borderRadius:16,padding:16,alignItems:'center',shadowColor:'#000',shadowOpacity:0.04,shadowRadius:6,elevation:2},
  statValue:{fontSize:20,fontWeight:'900',color:GREEN},
  statLabel:{fontSize:11,color:'#888',marginTop:4},
  tierCard:{backgroundColor:'#fff',marginHorizontal:16,borderRadius:16,padding:16,marginBottom:12,shadowColor:'#000',shadowOpacity:0.04,shadowRadius:6,elevation:2},
  tierLeft:{flexDirection:'row',alignItems:'center',marginBottom:12},
  tierIcon:{fontSize:32,marginRight:12},
  tierName:{fontSize:16,fontWeight:'800',color:'#333'},
  tierSub:{fontSize:12,color:'#888',marginTop:2},
  tierProgress:{},
  tierProgressText:{fontSize:12,color:'#666',marginBottom:6},
  tierBar:{height:6,backgroundColor:'#E0E0E0',borderRadius:3},
  tierBarFill:{height:6,backgroundColor:GREEN,borderRadius:3},
  weekCard:{backgroundColor:'#fff',marginHorizontal:16,borderRadius:16,padding:16,marginBottom:12,shadowColor:'#000',shadowOpacity:0.04,shadowRadius:6,elevation:2},
  weekTitle:{fontSize:15,fontWeight:'800',color:'#333',marginBottom:16},
  weekRow:{flexDirection:'row',alignItems:'flex-end',height:100,gap:6},
  weekDay:{flex:1,alignItems:'center',justifyContent:'flex-end'},
  weekBar:{width:'100%',borderRadius:4,minHeight:4},
  weekDayLabel:{fontSize:11,color:'#888',marginTop:6},
  weekTotal:{fontSize:14,fontWeight:'700',color:GREEN,marginTop:12,textAlign:'right'},
  requestModal:{backgroundColor:'#fff',borderTopLeftRadius:28,borderTopRightRadius:28,padding:28},
  requestHeader:{marginBottom:20},
  requestTitle:{fontSize:22,fontWeight:'900',color:GREEN,marginBottom:4},
  requestSub:{fontSize:14,color:'#888'},
  requestDetails:{backgroundColor:'#F5F6FA',borderRadius:16,padding:16,marginBottom:20},
  requestRow:{flexDirection:'row',alignItems:'center',marginBottom:14},
  requestIcon:{fontSize:24,marginRight:14},
  requestLabel:{fontSize:12,color:'#888',marginBottom:2},
  requestValue:{fontSize:15,fontWeight:'700',color:'#333'},
  fareBadge:{backgroundColor:GREEN,borderRadius:12,padding:14,alignItems:'center',marginTop:4},
  fareBadgeText:{color:'#fff',fontSize:20,fontWeight:'900'},
  requestBtns:{flexDirection:'row',gap:12},
  declineBtn:{flex:1,backgroundColor:'#FFE5E5',borderRadius:14,padding:16,alignItems:'center'},
  declineBtnText:{color:'#E53935',fontWeight:'800',fontSize:15},
  acceptBtn:{flex:2,backgroundColor:GREEN,borderRadius:14,padding:16,alignItems:'center',shadowColor:GREEN,shadowOpacity:0.3,shadowRadius:8,elevation:4},
  acceptBtnText:{color:'#fff',fontWeight:'800',fontSize:15},
});

const cs = StyleSheet.create({
  overlay:{position:'absolute',top:0,left:0,right:0,bottom:0,backgroundColor:'rgba(0,0,0,0.5)',zIndex:200,justifyContent:'flex-end'},
  container:{backgroundColor:'#fff',borderTopLeftRadius:28,borderTopRightRadius:28,padding:24,maxHeight:'85%'},
  title:{fontSize:20,fontWeight:'800',color:GREEN,marginBottom:20,textAlign:'center'},
  navRow:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:16},
  navBtn:{width:40,height:40,borderRadius:20,backgroundColor:'#F0F7F4',alignItems:'center',justifyContent:'center'},
  navArrow:{fontSize:24,color:GREEN,fontWeight:'300'},
  monthLabel:{fontSize:17,fontWeight:'800',color:'#333'},
  daysRow:{flexDirection:'row',marginBottom:8},
  dayLabel:{flex:1,textAlign:'center',fontSize:12,fontWeight:'700',color:'#888'},
  grid:{flexDirection:'row',flexWrap:'wrap'},
  cell:{width:'14.28%',aspectRatio:1,alignItems:'center',justifyContent:'center',borderRadius:8,marginBottom:4},
  cellSelected:{backgroundColor:GREEN},
  cellToday:{borderWidth:2,borderColor:GREEN},
  cellPast:{opacity:0.3},
  cellText:{fontSize:14,fontWeight:'600',color:'#333'},
  cellTextSelected:{color:'#fff',fontWeight:'800'},
  cellTextPast:{color:'#999'},
  cellTextToday:{color:GREEN,fontWeight:'800'},
  closeBtn:{marginTop:16,padding:14,alignItems:'center'},
  closeBtnText:{color:'#888',fontWeight:'600',fontSize:15},
  timePreview:{backgroundColor:'#F0F7F4',borderRadius:16,padding:20,alignItems:'center',marginBottom:20},
  timePreviewNight:{backgroundColor:'#1a1a2e'},
  timePreviewText:{fontSize:48,fontWeight:'900',color:GREEN},
  timePreviewBadge:{fontSize:14,color:'#888',marginTop:4},
  timeLabel:{fontSize:13,fontWeight:'700',color:'#888',marginBottom:10},
  hourScroll:{marginBottom:16},
  hourBtn:{paddingHorizontal:14,paddingVertical:10,borderRadius:10,backgroundColor:'#F5F5F5',marginRight:8},
  hourBtnActive:{backgroundColor:GREEN},
  hourText:{fontSize:14,fontWeight:'600',color:'#333'},
  hourTextActive:{color:'#fff'},
  minuteRow:{flexDirection:'row',gap:10,marginBottom:20},
  minuteBtn:{flex:1,padding:14,borderRadius:12,backgroundColor:'#F5F5F5',alignItems:'center'},
  minuteBtnActive:{backgroundColor:GREEN},
  minuteText:{fontSize:16,fontWeight:'700',color:'#333'},
  minuteTextActive:{color:'#fff'},
  confirmTimeBtn:{backgroundColor:GREEN,borderRadius:14,padding:16,alignItems:'center',marginBottom:8},
  confirmTimeBtnText:{color:'#fff',fontWeight:'800',fontSize:15},
});

const s = StyleSheet.create({
  container:{flex:1,backgroundColor:GREEN},
  scroll:{flexGrow:1,justifyContent:'center',padding:24},
  langRow:{flexDirection:'row',justifyContent:'flex-end',marginBottom:8},
  langBtn:{paddingHorizontal:12,paddingVertical:6,borderRadius:20,marginLeft:8,borderWidth:1,borderColor:'rgba(255,255,255,0.4)'},
  langActive:{backgroundColor:ORANGE,borderColor:ORANGE},
  langText:{color:'rgba(255,255,255,0.7)',fontWeight:'600',fontSize:13},
  langTextActive:{color:'#fff'},
  logoArea:{alignItems:'center',marginBottom:32},
  logo:{fontSize:52,fontWeight:'900',color:'#fff',letterSpacing:-1},
  logoOrange:{color:ORANGE},
  flag:{fontSize:28,marginTop:4},
  card:{backgroundColor:'#fff',borderRadius:24,padding:28,shadowColor:'#000',shadowOpacity:0.15,shadowRadius:20,elevation:10},
  cardTitle:{fontSize:24,fontWeight:'800',color:GREEN,marginBottom:4},
  cardSub:{fontSize:14,color:'#888',marginBottom:24},
  phoneRow:{flexDirection:'row',marginBottom:14},
  prefix:{backgroundColor:'#F5F5F5',borderRadius:12,padding:16,marginRight:8,justifyContent:'center'},
  prefixText:{fontSize:15,color:'#222',fontWeight:'600'},
  phoneInput:{flex:1,backgroundColor:'#F5F5F5',borderRadius:12,padding:16,fontSize:16,color:'#222'},
  input:{backgroundColor:'#F5F5F5',borderRadius:12,padding:16,fontSize:16,marginBottom:14,color:'#222'},
  otpInput:{textAlign:'center',fontSize:28,fontWeight:'800',letterSpacing:8},
  btn:{backgroundColor:GREEN,borderRadius:12,padding:18,alignItems:'center',marginTop:4},
  btnOff:{opacity:0.6},
  btnText:{color:'#fff',fontWeight:'800',fontSize:16},
  changeBtn:{alignItems:'center',marginTop:16},
  changeText:{color:GREEN,fontWeight:'600',fontSize:14},
  homeHeader:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',padding:24,paddingTop:60},
  homeGreeting:{fontSize:22,fontWeight:'800',color:'#fff'},
  homeSubGreeting:{fontSize:15,color:'rgba(255,255,255,0.75)',marginTop:2},
  timeBadge:{backgroundColor:'rgba(255,255,255,0.2)',borderRadius:20,paddingHorizontal:14,paddingVertical:8},
  timeBadgeNight:{backgroundColor:'rgba(0,0,0,0.3)'},
  timeBadgeText:{color:'#fff',fontWeight:'700',fontSize:13},
  homeScroll:{flex:1,backgroundColor:'#F5F6FA',borderTopLeftRadius:28,borderTopRightRadius:28},
  rideTypeRow:{flexDirection:'row',margin:16,marginBottom:0,backgroundColor:'#E8EDE8',borderRadius:14,padding:4},
  rideTypeBtn:{flex:1,paddingVertical:10,alignItems:'center',borderRadius:10},
  rideTypeBtnActive:{backgroundColor:'#fff',shadowColor:'#000',shadowOpacity:0.08,shadowRadius:4,elevation:2},
  rideTypeText:{fontSize:14,fontWeight:'600',color:'#888'},
  rideTypeTextActive:{color:GREEN,fontWeight:'800'},
  schedCard:{backgroundColor:'#fff',marginHorizontal:16,marginTop:12,borderRadius:20,padding:20,shadowColor:'#000',shadowOpacity:0.06,shadowRadius:10,elevation:3},
  schedRow:{flexDirection:'column',gap:10},
  schedPickerBtn:{flexDirection:'row',alignItems:'center',backgroundColor:'#F5F5F5',borderRadius:12,padding:14},
  schedPickerIcon:{fontSize:18,marginRight:10},
  schedPickerText:{fontSize:15,color:'#222',fontWeight:'600',flex:1},
  schedPickerPlaceholder:{color:'#999',fontWeight:'400'},
  schedNightBadge:{borderRadius:10,padding:10,marginTop:10,alignItems:'center'},
  schedNightActive:{backgroundColor:'#1a1a2e'},
  schedDayActive:{backgroundColor:'#FFF8E1'},
  schedNightText:{fontWeight:'700',fontSize:13},
  destCard:{backgroundColor:'#fff',marginHorizontal:16,marginTop:12,marginBottom:12,borderRadius:20,padding:20,shadowColor:'#000',shadowOpacity:0.06,shadowRadius:10,elevation:3},
  destLabel:{fontSize:13,fontWeight:'700',color:'#888',marginBottom:10,letterSpacing:0.5},
  destInput:{backgroundColor:'#F5F5F5',borderRadius:12,padding:14,fontSize:16,color:'#222'},
  stopRow:{flexDirection:'row',alignItems:'center',marginBottom:8},
  stopBadge:{width:28,height:28,borderRadius:14,backgroundColor:GREEN,alignItems:'center',justifyContent:'center',marginRight:10},
  stopBadgeText:{color:'#fff',fontWeight:'800',fontSize:13},
  stopInput:{flex:1,backgroundColor:'#F5F5F5',borderRadius:12,padding:12,fontSize:15,color:'#222'},
  removeBtn:{marginLeft:8,width:28,height:28,borderRadius:14,backgroundColor:'#FFE5E5',alignItems:'center',justifyContent:'center'},
  removeBtnText:{color:'#E53935',fontSize:12,fontWeight:'800'},
  waitRow:{flexDirection:'row',alignItems:'center',backgroundColor:'#F0F7F4',borderRadius:10,padding:10,marginBottom:12,marginLeft:38},
  waitIcon:{fontSize:16,marginRight:8},
  waitText:{flex:1,fontSize:13,color:GREEN,fontWeight:'600'},
  waitChevron:{fontSize:20,color:GREEN},
  addStopBtn:{borderWidth:1.5,borderColor:GREEN,borderStyle:'dashed',borderRadius:12,padding:12,alignItems:'center',marginTop:4},
  addStopText:{color:GREEN,fontWeight:'700',fontSize:14},
  fareBreakdown:{backgroundColor:'#F0F7F4',borderRadius:12,padding:14,marginTop:14},
  fareRow:{flexDirection:'row',justifyContent:'space-between',marginBottom:6},
  fareLabel:{fontSize:13,color:'#666'},
  fareValue:{fontSize:13,color:'#333',fontWeight:'600'},
  fareTotalRow:{borderTopWidth:1,borderTopColor:'#C8E6C9',paddingTop:8,marginTop:4},
  fareTotalLabel:{fontSize:15,fontWeight:'800',color:GREEN},
  fareTotalValue:{fontSize:15,fontWeight:'800',color:GREEN},
  sectionTitle:{fontSize:15,fontWeight:'800',color:'#333',marginHorizontal:16,marginBottom:8},
  vehicleCard:{flexDirection:'row',alignItems:'center',backgroundColor:'#fff',marginHorizontal:16,marginBottom:10,borderRadius:16,padding:16,borderWidth:2,borderColor:'transparent',shadowColor:'#000',shadowOpacity:0.04,shadowRadius:6,elevation:2},
  vehicleCardSelected:{borderColor:GREEN},
  vehicleIcon:{fontSize:32,marginRight:14},
  vehicleInfo:{flex:1},
  vehicleName:{fontSize:16,fontWeight:'700',color:'#333'},
  vehicleNameSelected:{color:GREEN},
  vehicleDesc:{fontSize:13,color:'#999',marginTop:2},
  vehicleFare:{alignItems:'flex-end'},
  vehicleFareAmt:{fontSize:16,fontWeight:'800',color:'#333'},
  vehicleFareSelected:{color:GREEN},
  vehicleFareNote:{fontSize:11,color:'#aaa',marginTop:2},
  dot:{width:8,height:8,borderRadius:4,backgroundColor:GREEN,marginLeft:8},
  nightNotice:{backgroundColor:'#1a1a2e',marginHorizontal:16,borderRadius:12,padding:12,marginBottom:8},
  nightNoticeText:{color:'#a0a0ff',fontSize:13,fontWeight:'600',textAlign:'center'},
  bookBtn:{backgroundColor:GREEN,marginHorizontal:16,borderRadius:16,padding:20,alignItems:'center',marginTop:8,shadowColor:GREEN,shadowOpacity:0.4,shadowRadius:12,elevation:6},
  bookBtnOff:{opacity:0.5},
  bookBtnText:{color:'#fff',fontWeight:'800',fontSize:17},
  modalOverlay:{position:'absolute',top:0,left:0,right:0,bottom:0,backgroundColor:'rgba(0,0,0,0.5)',zIndex:100,justifyContent:'flex-end'},
  modal:{backgroundColor:'#fff',borderTopLeftRadius:24,borderTopRightRadius:24,padding:24},
  modalTitle:{fontSize:18,fontWeight:'800',color:GREEN,marginBottom:4},
  modalSub:{fontSize:13,color:'#888',marginBottom:16},
  modalNoWait:{padding:14,borderRadius:12,backgroundColor:'#F5F5F5',alignItems:'center',marginBottom:8},
  modalNoWaitText:{color:'#666',fontWeight:'600'},
  waitOption:{flexDirection:'row',justifyContent:'space-between',padding:14,borderRadius:12,backgroundColor:'#F5F5F5',marginBottom:8},
  waitOptionActive:{backgroundColor:GREEN},
  waitOptionText:{fontSize:15,fontWeight:'700',color:'#333'},
  waitOptionFare:{fontSize:15,fontWeight:'600',color:'#666'},
  waitOptionTextActive:{color:'#fff'},
  modalClose:{marginTop:8,padding:14,alignItems:'center'},
  modalCloseText:{color:'#888',fontWeight:'600'},
  confirmModal:{backgroundColor:'#fff',borderTopLeftRadius:28,borderTopRightRadius:28,padding:28},
  confirmTitle:{fontSize:20,fontWeight:'800',color:GREEN,marginBottom:20},
  confirmDetails:{backgroundColor:'#F5F6FA',borderRadius:16,padding:16,marginBottom:16},
  confirmRow:{flexDirection:'row',justifyContent:'space-between',alignItems:'flex-start',marginBottom:12},
  confirmLabel:{fontSize:13,color:'#888',flex:1},
  confirmValue:{fontSize:14,fontWeight:'600',color:'#333',flex:2,textAlign:'right'},
  confirmTotalRow:{borderTopWidth:1,borderTopColor:'#E0E0E0',paddingTop:12,marginTop:4,marginBottom:0},
  confirmTotalLabel:{fontSize:16,fontWeight:'800',color:GREEN,flex:1},
  confirmTotalValue:{fontSize:18,fontWeight:'900',color:GREEN,flex:2,textAlign:'right'},
  confirmBtn:{backgroundColor:GREEN,borderRadius:16,padding:18,alignItems:'center',marginBottom:10,shadowColor:GREEN,shadowOpacity:0.3,shadowRadius:8,elevation:4},
  confirmBtnText:{color:'#fff',fontWeight:'800',fontSize:16},
  cancelBtn:{padding:14,alignItems:'center'},
  cancelBtnText:{color:'#888',fontWeight:'600',fontSize:15},
  nightBadge:{backgroundColor:'#1a1a2e',borderRadius:8,padding:8,marginTop:8,alignItems:'center'},
  nightBadgeText:{color:'#a0a0ff',fontSize:12,fontWeight:'700'},
  reminderBox:{flexDirection:'row',alignItems:'center',backgroundColor:'#FFF8E1',borderRadius:12,padding:14,marginBottom:16},
  reminderTitle:{fontSize:14,fontWeight:'700',color:'#7A5200'},
  reminderSub:{fontSize:12,color:'#7A5200',marginTop:2,flex:1},
  successScroll:{flexGrow:1,alignItems:'center',padding:24,paddingTop:80},
  successIcon:{width:90,height:90,borderRadius:45,backgroundColor:'rgba(255,255,255,0.2)',alignItems:'center',justifyContent:'center',marginBottom:20},
  successTitle:{fontSize:28,fontWeight:'900',color:'#fff',marginBottom:8},
  successSub:{fontSize:16,color:'rgba(255,255,255,0.8)',marginBottom:32,textAlign:'center'},
  successCard:{backgroundColor:'#fff',borderRadius:24,padding:24,width:'100%',marginBottom:16},
  successRow:{flexDirection:'row',justifyContent:'space-between',alignItems:'flex-start',marginBottom:14},
  successLabel:{fontSize:13,color:'#888',flex:1},
  successValue:{fontSize:14,fontWeight:'600',color:'#333',flex:2,textAlign:'right'},
  newRideBtn:{backgroundColor:'rgba(255,255,255,0.2)',borderRadius:16,padding:18,alignItems:'center',width:'100%',marginTop:8,borderWidth:1.5,borderColor:'rgba(255,255,255,0.4)'},
  newRideBtnText:{color:'#fff',fontWeight:'800',fontSize:16},
});
