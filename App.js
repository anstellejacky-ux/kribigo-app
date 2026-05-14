import React, { useState, useEffect } from 'react';
import { persistLogin, loadSession, logout } from './src/services/auth';
import { LogBox } from 'react-native';
LogBox.ignoreLogs(['VirtualizedLists should never be nested']);
import { connectSocket, joinAsRider, joinAsDriver, onNewRideRequest, offNewRideRequest, getSocket } from './src/services/socket';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import * as SecureStore from 'expo-secure-store';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import {
  View, Text, TextInput, TouchableOpacity, Image,
  StyleSheet, KeyboardAvoidingView, Platform,
  ActivityIndicator, Alert, ScrollView, Modal, Animated
} from 'react-native';


const API = 'https://kribigo-backend.onrender.com/api/v1';

function getTier(totalTrips) {
  if (totalTrips >= 500) return {name:'Diamond', nameFr:'Diamant', icon:'💎', commission:8,  next:null,       nextTrips:0};
  if (totalTrips >= 200) return {name:'Gold',    nameFr:'Or',      icon:'🥇', commission:10, next:'Diamond', nextTrips:500};
  if (totalTrips >= 100) return {name:'Silver',  nameFr:'Argent',  icon:'🥈', commission:12, next:'Gold',    nextTrips:200};
  return                        {name:'Bronze',  nameFr:'Bronze',  icon:'🥉', commission:15, next:'Silver',  nextTrips:100};
}


// ─── POPULAR KRIBI SPOTS ────────────────────────────────────
const KRIBI_SPOTS = [
  { icon: '🌊', name: 'Chutes de la Lobé',         lat: 2.8720, lng: 9.9050 },
  { icon: '🍔', name: 'Burger Bar',                 lat: 2.9380, lng: 9.9080 },
  { icon: '⚓', name: 'Débarcadère Mboa Manga',     lat: 2.9350, lng: 9.9100 },
  { icon: '🏨', name: 'Hotel Tara Plage',           lat: 2.9300, lng: 9.9120 },
  { icon: '🏖️', name: 'Golden K Resort',            lat: 2.9250, lng: 9.9130 },
  { icon: '🏨', name: 'Hotel Le Lagon Resort',      lat: 2.9200, lng: 9.9140 },
  { icon: '🏨', name: 'Hotel Ilomba Beach',         lat: 2.8980, lng: 9.9020 },
  { icon: '🏨', name: 'Hôtel le Phare',             lat: 2.9400, lng: 9.9090 },
  { icon: '🍜', name: 'ChongQing Restaurant',       lat: 2.9370, lng: 9.9085 },
  { icon: '🥖', name: 'Boulangerie du Peuple',      lat: 2.9360, lng: 9.9075 },
  { icon: '🎵', name: "People's Club",              lat: 2.9355, lng: 9.9078 },
  { icon: '🏢', name: 'Immeuble Emmergence - PAK',  lat: 2.9320, lng: 9.9060 },
  { icon: '🔵', name: 'Carrefour Kingue',           lat: 2.9410, lng: 9.9095 },
  { icon: '🏖️', name: 'Mykonos Paradise Kribi',    lat: 2.9280, lng: 9.9110 },
  { icon: '🚢', name: 'Port Autonome de Kribi',     lat: 2.9450, lng: 9.9150 },
  { icon: '🌴', name: 'Akiba Beach Lounge',         lat: 2.9310, lng: 9.9115 },
  { icon: '🌿', name: 'Oasis Villa Kribi',          lat: 2.9290, lng: 9.9125 },
  { icon: '🛒', name: 'Marché Central de Kribi',    lat: 2.9390, lng: 9.9070 },
  { icon: '🛒', name: 'Marché Nkolbiteng',          lat: 2.9420, lng: 9.9055 },
  { icon: '🎨', name: 'Marchés Artisanaux',         lat: 2.9375, lng: 9.9060 },
  { icon: '⛵', name: 'Kribi Marina',               lat: 2.9340, lng: 9.9100 },
  { icon: '💆', name: 'Elabi Pool & Spa',           lat: 2.9260, lng: 9.9120 },
  { icon: '🏨', name: 'Angelina Hotel Kribi',       lat: 2.9330, lng: 9.9090 },
];

// ─── PRICING CONFIG ────────────────────────────────────────
const PRICING = {
  moto:     { base_day: 1000, base_night: 1500, per_km: 150 },
  economie: { base_day: 2000, base_night: 3000, per_km: 250 },
  confort:  { base_day: 2500, base_night: 3500, per_km: 350 },
};
const WAIT_RATE_PER_15MIN = 500;
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
function calcFare({ type, isCourse, stops, waitUnits, scheduledHour, realDistanceKm }) {
  const p = PRICING[type];
  const hour = scheduledHour ?? new Date().getHours();
  const night = isNightAt(hour);
  const base = night ? p.base_night : p.base_day;
  if (!isCourse) {
    const km = realDistanceKm || KM_PER_STOP;
    return base + Math.round(km * p.per_km);
  }
  const numLegs = Math.max(1, stops.filter(s => s.trim()).length);
  const km = realDistanceKm || (numLegs * KM_PER_STOP);
  const distFare = base + Math.round(km * p.per_km);
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
  const [driverTripStatus, setDriverTripStatus] = useState(null);
  const [acceptedTrip, setAcceptedTrip] = useState(null);
  const [showPinInput, setShowPinInput] = useState(false);
  const [enteredPin, setEnteredPin] = useState('');
  const [pinError, setPinError] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [driverTab, setDriverTab] = useState('home');
  const [driverName, setDriverName] = useState('');
  const [driverPhoto, setDriverPhoto] = useState(null);
  const [driverVehicle, setDriverVehicle] = useState('moto');
  const [driverPlate, setDriverPlate] = useState('');
  const [driverIdNumber, setDriverIdNumber] = useState('');
  const [driverTotalTrips, setDriverTotalTrips] = useState(67);
  const [earningsView, setEarningsView] = useState('week');
  const [driverTrips, setDriverTrips] = useState([
    {id:1, date:"Aujourd'hui 14:32", pickup:'Centre Ville', dest:'Chutes de la Lobé', fare:3200, status:'completed', vehicle:'Moto'},
    {id:2, date:"Aujourd'hui 11:15", pickup:'Marché Central', dest:'Hôtel Seme Beach', fare:4500, status:'completed', vehicle:'Moto'},
    {id:3, date:'Hier 18:44', pickup:'Gare Routière', dest:'Centre Ville', fare:2800, status:'completed', vehicle:'Moto'},
    {id:4, date:'Hier 09:20', pickup:'Port de Kribi', dest:'Kribi Beach Hotel', fare:3900, status:'cancelled', vehicle:'Moto'},
    {id:5, date:'Lun 16:05', pickup:'Centre Ville', dest:'Campo Beach', fare:8500, status:'completed', vehicle:'Moto'},
  ]);
  const pulseAnim = React.useRef(new Animated.Value(1)).current;

  // Load persisted driver profile
  React.useEffect(() => {
    (async () => {
      const n = await SecureStore.getItemAsync('kribigo_driver_name');
      const p = await SecureStore.getItemAsync('kribigo_driver_photo');
      const v = await SecureStore.getItemAsync('kribigo_driver_vehicle');
      const t = await SecureStore.getItemAsync('kribigo_driver_trips');
      const pl = await SecureStore.getItemAsync('kribigo_driver_plate');
      const id = await SecureStore.getItemAsync('kribigo_driver_id');
      if (n) setDriverName(n);
      if (p) setDriverPhoto(p);
      if (v) setDriverVehicle(v);
      if (t) setDriverTotalTrips(parseInt(t));
      if (pl) setDriverPlate(pl);
      if (id) setDriverIdNumber(id);
    })();
  }, []);
  React.useEffect(() => {
    if (isOnline && !driverTripStatus) {
      Animated.loop(Animated.sequence([
        Animated.timing(pulseAnim, {toValue:1.3, duration:700, useNativeDriver:true}),
        Animated.timing(pulseAnim, {toValue:1, duration:700, useNativeDriver:true}),
      ])).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isOnline, driverTripStatus]);

  // Simulate incoming request after going online
  const toggleOnline = () => {
    const next = !isOnline;
    setIsOnline(next);
    if (next) {
      setTimeout(() => setHasRequest(true), 3000);
    } else {
      setHasRequest(false);
      setDriverTripStatus(null);
      setAcceptedTrip(null);
    }
  };

  const todayEarnings = 11500;
  const todayTrips = 4;
  const rating = 4.9;

  return (
    <View style={s.container}>
      {driverTab==='home' && <>
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
              <TouchableOpacity style={dr.acceptBtn} onPress={() => { setHasRequest(false); Alert.alert('✅', fr ? 'Course acceptée ! En route vers le passager.' : 'Ride accepted! Head to pickup.', [{text: fr ? 'OK' : 'OK', onPress: () => setDriverTripStatus('en_route')}]); }}>
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

        {isOnline && !driverTripStatus && (
          <View style={dr.searchingBadge}>
            <Animated.View style={{transform:[{scale:pulseAnim}],width:10,height:10,borderRadius:5,backgroundColor:'#1B6B4A',marginRight:8}}/>
            <Text style={dr.searchingText}>{fr ? 'Recherche de passagers...' : 'Searching for riders...'}</Text>
          </View>
        )}

        {driverTripStatus === 'en_route' && (
          <View style={dr.tripStatusCard}>
            <Text style={dr.tripStatusIcon}>🚗</Text>
            <Text style={dr.tripStatusTitle}>{fr ? 'En route vers le passager' : 'Heading to rider'}</Text>
            <Text style={dr.tripStatusSub}>{acceptedTrip?.pickup_address || 'Centre Ville, Kribi'}</Text>
            <TouchableOpacity style={dr.arrivedBtn} onPress={() => {
              setDriverTripStatus('pin_verify');
              setShowPinInput(true);
            }}>
              <Text style={dr.arrivedBtnText}>📍 {fr ? 'Je suis arrivé' : 'I have arrived'}</Text>
            </TouchableOpacity>
          </View>
        )}

        {driverTripStatus === 'in_progress' && (
          <View style={[dr.tripStatusCard, {backgroundColor:'#1B6B4A'}]}>
            <Text style={dr.tripStatusIcon}>⚡</Text>
            <Text style={[dr.tripStatusTitle, {color:'#fff'}]}>{fr ? 'Course en cours' : 'Trip in progress'}</Text>
            <Text style={[dr.tripStatusSub, {color:'rgba(255,255,255,0.8)'}]}>{acceptedTrip?.dest_address || ''}</Text>
            <TouchableOpacity style={[dr.arrivedBtn, {backgroundColor:'#fff'}]} onPress={() => {
              setDriverTripStatus(null);
              setAcceptedTrip(null);
              Alert.alert('✅', fr ? 'Course terminée !' : 'Trip completed!');
            }}>
              <Text style={[dr.arrivedBtnText, {color:'#1B6B4A'}]}>🏁 {fr ? 'Terminer la course' : 'End trip'}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* PIN Modal */}
        <Modal visible={showPinInput} transparent animationType="slide">
          <View style={s.modalOverlay}>
            <View style={dr.pinModal}>
              <Text style={dr.pinTitle}>🔐 {fr ? 'Code de démarrage' : 'Start Code'}</Text>
              <Text style={dr.pinSub}>{fr ? 'Demandez le code au passager' : 'Ask the rider for their code'}</Text>
              <View style={dr.pinDisplay}>
                {[0,1,2,3].map(i => (
                  <View key={i} style={[dr.pinDot, enteredPin.length > i && dr.pinDotFilled]}/>
                ))}
              </View>
              {pinError && <Text style={dr.pinError}>{fr ? '❌ Code incorrect' : '❌ Wrong code'}</Text>}
              <View style={dr.numpad}>
                {['1','2','3','4','5','6','7','8','9','','0','⌫'].map((k,i) => (
                  <TouchableOpacity key={i} style={[dr.numKey, k==='' && {opacity:0}]}
                    onPress={() => {
                      if (k === '⌫') { setEnteredPin(p => p.slice(0,-1)); setPinError(false); }
                      else if (k && enteredPin.length < 4) {
                        const next = enteredPin + k;
                        setEnteredPin(next);
                        if (next.length === 4) {
                          // Verify PIN against acceptedTrip or default test PIN
                          const correctPin = acceptedTrip?.security_pin || '1234';
                          if (next === correctPin) {
                            setShowPinInput(false);
                            setEnteredPin('');
                            setDriverTripStatus('in_progress');
                            Alert.alert('✅', fr ? 'Code correct ! Bonne course !' : 'Code correct! Have a good trip!');
                          } else {
                            setPinError(true);
                            setTimeout(() => { setEnteredPin(''); setPinError(false); }, 1000);
                          }
                        }
                      }
                    }}>
                    <Text style={dr.numKeyText}>{k}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity style={dr.pinCancelBtn} onPress={() => { setShowPinInput(false); setEnteredPin(''); setPinError(false); }}>
                <Text style={dr.pinCancelText}>{fr ? 'Annuler' : 'Cancel'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Stats */}
        <Text style={[s.sectionTitle, {marginTop: 20}]}>{fr ? 'Aujourd\'hui' : 'Today'}</Text>
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
        {(()=>{ const tier=getTier(driverTotalTrips); const pct=tier.next?Math.min(100,Math.round((driverTotalTrips/(tier.nextTrips))*100)):100; return (
        <View style={dr.tierCard}>
          <View style={dr.tierLeft}>
            <Text style={dr.tierIcon}>{tier.icon}</Text>
            <View>
              <Text style={dr.tierName}>{fr?tier.nameFr:tier.name}</Text>
              <Text style={dr.tierSub}>{tier.commission}% commission • {driverTotalTrips} {fr?'courses':'trips'}</Text>
            </View>
          </View>
          {tier.next && <View style={dr.tierProgress}>
            <Text style={dr.tierProgressText}>{tier.nextTrips-driverTotalTrips} {fr?'courses →':'trips →'} {fr?getTier(tier.nextTrips).nameFr:tier.next} {getTier(tier.nextTrips).icon}</Text>
            <View style={dr.tierBar}><View style={[dr.tierBarFill, {width: pct+'%'}]}/></View>
          </View>}
        </View>);})()}

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

        {/* Simulate complete button for testing */}

        <View style={{height:100}}/>
      </ScrollView>
      </>}

      {/* COURSES TAB */}
      {driverTab==='trips' && (
        <ScrollView style={{flex:1}} contentContainerStyle={{padding:16,paddingTop:56,paddingBottom:100}}>
          <Text style={[s.sectionTitle,{marginBottom:16}]}>{fr?'Mes courses':'My trips'}</Text>
          {driverTrips.map(trip=>(
            <View key={trip.id} style={dr.tripHistCard}>
              <View style={dr.tripHistHeader}>
                <Text style={dr.tripHistDate}>{trip.date}</Text>
                <View style={[dr.tripHistBadge, trip.status==='completed'?{backgroundColor:'#E8F5E9'}:{backgroundColor:'#FFEBEE'}]}>
                  <Text style={[dr.tripHistBadgeText, trip.status==='completed'?{color:'#2E7D32'}:{color:'#C62828'}]}>
                    {trip.status==='completed'?(fr?'Terminée':'Completed'):(fr?'Annulée':'Cancelled')}
                  </Text>
                </View>
              </View>
              <View style={dr.tripHistRow}>
                <Text style={{fontSize:16}}>📍</Text>
                <Text style={dr.tripHistAddr} numberOfLines={1}>{trip.pickup}</Text>
              </View>
              <View style={dr.tripHistRow}>
                <Text style={{fontSize:16}}>🏁</Text>
                <Text style={dr.tripHistAddr} numberOfLines={1}>{trip.dest}</Text>
              </View>
              <View style={dr.tripHistFooter}>
                <Text style={dr.tripHistVehicle}>🏍️ {trip.vehicle}</Text>
                <Text style={dr.tripHistFare}>{trip.status==='completed'?trip.fare.toLocaleString()+' XAF':'-'}</Text>
              </View>
            </View>
          ))}
          {driverTrips.length===0&&(
            <View style={{alignItems:'center',marginTop:60}}>
              <Text style={{fontSize:40}}>📋</Text>
              <Text style={{fontSize:16,color:'#999',marginTop:12}}>{fr?'Aucune course pour instant':'No trips yet'}</Text>
            </View>
          )}
        </ScrollView>
      )}

      {/* PROFIL TAB */}
      {driverTab==='profile' && (
        <ScrollView style={{flex:1}} contentContainerStyle={{padding:16,paddingTop:56,paddingBottom:100}}>
          <Text style={[s.sectionTitle,{marginBottom:16}]}>{fr?'Mon profil':'My profile'}</Text>
          <View style={{alignItems:'center',marginBottom:24}}>
            <TouchableOpacity onPress={async()=>{
              const {status}=await ImagePicker.requestMediaLibraryPermissionsAsync();
              if(status!=='granted') return Alert.alert(fr?'Permission refusée':'Permission denied');
              const result=await ImagePicker.launchImageLibraryAsync({mediaTypes:ImagePicker.MediaTypeOptions.Images,allowsEditing:true,aspect:[1,1],quality:0.7});
              if(!result.canceled) {
                const uri = result.assets[0].uri;
                setDriverPhoto(uri);
                await SecureStore.setItemAsync('kribigo_driver_photo', uri);
              }
            }}>
              {driverPhoto?(
                <Image source={{uri:driverPhoto}} style={dr.profilePhoto}/>
              ):(
                <View style={dr.profilePhotoPlaceholder}>
                  <Text style={{fontSize:40}}>📷</Text>
                  <Text style={{fontSize:12,color:'#999',marginTop:4}}>{fr?'Ajouter photo':'Add photo'}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
          <Text style={dr.profileLabel}>{fr?'Nom complet':'Full name'}</Text>
          <TextInput
            style={dr.profileInput}
            placeholder={fr?'Entrez votre nom...':'Enter your name...'}
            placeholderTextColor="#999"
            value={driverName}
            onChangeText={setDriverName}
          />
          <Text style={dr.profileLabel}>{fr?'Téléphone':'Phone'}</Text>
          <View style={dr.profileInputDisabled}>
            <Text style={{color:'#666',fontSize:15}}>{phone}</Text>
          </View>
          <Text style={dr.profileLabel}>{fr?'Plaque d\'immatriculation':'License plate'}</Text>
          <TextInput
            style={dr.profileInput}
            placeholder="Ex: LT 1234 A"
            placeholderTextColor="#999"
            value={driverPlate}
            onChangeText={setDriverPlate}
            autoCapitalize="characters"
          />
          <Text style={dr.profileLabel}>{fr?'Numéro CNI':'CNI number'}</Text>
          <TextInput
            style={dr.profileInput}
            placeholder="Ex: 123456789"
            placeholderTextColor="#999"
            value={driverIdNumber}
            onChangeText={setDriverIdNumber}
          />
          <Text style={dr.profileLabel}>{fr?'Véhicule':'Vehicle'}</Text>
          <View style={{flexDirection:'row',gap:8,marginBottom:4}}>
            {[{id:'moto',icon:'🏍️',label:'Moto'},{id:'economie',icon:'🚗',label:'Économie'},{id:'confort',icon:'🚙',label:'Confort'}].map(v=>(
              <TouchableOpacity key={v.id} onPress={()=>{
                setDriverVehicle(v.id);
                SecureStore.setItemAsync('kribigo_driver_vehicle', v.id);
              }} style={{flex:1,padding:10,borderRadius:12,alignItems:'center',borderWidth:2,borderColor:driverVehicle===v.id?'#1B6B4A':'#E0E0E0',backgroundColor:driverVehicle===v.id?'#E8F5EE':'#fff'}}>
                <Text style={{fontSize:20}}>{v.icon}</Text>
                <Text style={{fontSize:11,color:driverVehicle===v.id?'#1B6B4A':'#666',fontWeight:driverVehicle===v.id?'700':'400',marginTop:2}}>{v.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {(()=>{ const tier=getTier(driverTotalTrips); const pct=tier.next?Math.min(100,Math.round((driverTotalTrips/tier.nextTrips)*100)):100; return (
          <View style={[dr.tierCard,{marginTop:16}]}>
            <View style={dr.tierLeft}>
              <Text style={dr.tierIcon}>{tier.icon}</Text>
              <View>
                <Text style={dr.tierName}>{fr?tier.nameFr:tier.name}</Text>
                <Text style={dr.tierSub}>{tier.commission}% commission • {driverTotalTrips} {fr?'courses':'trips'}</Text>
              </View>
            </View>
            {tier.next && <View style={dr.tierProgress}>
              <Text style={dr.tierProgressText}>{tier.nextTrips-driverTotalTrips} {fr?'courses →':'trips →'} {fr?getTier(tier.nextTrips).nameFr:tier.next} {getTier(tier.nextTrips).icon}</Text>
              <View style={dr.tierBar}><View style={[dr.tierBarFill,{width:pct+'%'}]}/></View>
            </View>}
          </View>);})()} 
          <TouchableOpacity style={{backgroundColor:'#1B6B4A',borderRadius:12,padding:14,alignItems:'center',marginTop:16}} onPress={async()=>{
            await SecureStore.setItemAsync('kribigo_driver_name', driverName);
            await SecureStore.setItemAsync('kribigo_driver_plate', driverPlate);
            await SecureStore.setItemAsync('kribigo_driver_id', driverIdNumber);
            await SecureStore.setItemAsync('kribigo_driver_vehicle', driverVehicle);
            Alert.alert('✅', fr?'Profil sauvegardé !':'Profile saved!');
          }}>
            <Text style={{color:'#fff',fontWeight:'700',fontSize:15}}>{fr?'💾 Sauvegarder':'💾 Save profile'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[dr.switchBtn,{marginTop:12}]} onPress={onSwitchRole}>
            <Text style={dr.switchBtnText}>{fr?'🧑 Passer en mode Passager':'🧑 Switch to Rider mode'}</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* GAINS TAB */}
      {driverTab==='earnings' && (()=>{
        const daily = [{label:fr?'Lun':'Mon',amount:7200},{label:fr?'Mar':'Tue',amount:9500},{label:fr?'Mer':'Wed',amount:4300},{label:fr?'Jeu':'Thu',amount:11200},{label:fr?'Ven':'Fri',amount:8900},{label:'Sam',amount:15400},{label:'Dim',amount:3200}];
        const weekly = [{label:'S1',amount:42000},{label:'S2',amount:67500},{label:'S3',amount:38000},{label:'S4',amount:54200}];
        const monthly = [{label:fr?'Jan':'Jan',amount:180000},{label:fr?'Fév':'Feb',amount:145000},{label:fr?'Mar':'Mar',amount:210000},{label:fr?'Avr':'Apr',amount:195000},{label:fr?'Mai':'May',amount:54200}];
        const data = earningsView==='week'?daily:earningsView==='month'?weekly:monthly;
        const maxAmt = Math.max(...data.map(d=>d.amount));
        const total = data.reduce((s,d)=>s+d.amount,0);
        return (
        <ScrollView style={{flex:1}} contentContainerStyle={{padding:16,paddingTop:56,paddingBottom:100}}>
          <Text style={[s.sectionTitle,{marginBottom:16}]}>{fr?'Mes gains':'My earnings'}</Text>
          {/* Period selector */}
          <View style={{flexDirection:'row',backgroundColor:'#F0F0F0',borderRadius:12,padding:4,marginBottom:20}}>
            {[{id:'week',fr:'Cette semaine',en:'This week'},{id:'month',fr:'Ce mois',en:'This month'},{id:'year',fr:'Cette année',en:'This year'}].map(p=>(
              <TouchableOpacity key={p.id} onPress={()=>setEarningsView(p.id)}
                style={{flex:1,padding:8,borderRadius:10,alignItems:'center',backgroundColor:earningsView===p.id?'#fff':'transparent'}}>
                <Text style={{fontSize:12,fontWeight:earningsView===p.id?'700':'400',color:earningsView===p.id?'#1B6B4A':'#999'}}>{fr?p.fr:p.en}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {/* Earnings breakdown */}
          {(()=>{
            const commission = getTier(driverTotalTrips).commission;
            const commissionAmt = Math.round(total * commission / 100);
            const net = total - commissionAmt;
            return (
            <View style={{marginBottom:20}}>
              {/* Net — prominent */}
              <View style={{backgroundColor:'#1B6B4A',borderRadius:16,padding:20,alignItems:'center',marginBottom:10}}>
                <Text style={{color:'rgba(255,255,255,0.7)',fontSize:13,marginBottom:4}}>{fr?'Vos gains nets':'Your net earnings'}</Text>
                <Text style={{color:'#fff',fontSize:36,fontWeight:'800'}}>{net.toLocaleString()} XAF</Text>
              </View>
              {/* Gross + commission breakdown */}
              <View style={{backgroundColor:'#fff',borderRadius:16,padding:16,shadowColor:'#000',shadowOpacity:0.06,shadowRadius:6,elevation:2}}>
                <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center',paddingVertical:8,borderBottomWidth:1,borderBottomColor:'#F0F0F0'}}>
                  <Text style={{fontSize:14,color:'#555'}}>{fr?'Tarifs encaissés (brut)':'Gross fares collected'}</Text>
                  <Text style={{fontSize:15,fontWeight:'700',color:'#1a1a1a'}}>{total.toLocaleString()} XAF</Text>
                </View>
                <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center',paddingVertical:8,borderBottomWidth:1,borderBottomColor:'#F0F0F0'}}>
                  <Text style={{fontSize:14,color:'#555'}}>{fr?'Commission KribiGo (':'KribiGo commission ('}{commission}%)</Text>
                  <Text style={{fontSize:15,fontWeight:'700',color:'#E53E3E'}}>-{commissionAmt.toLocaleString()} XAF</Text>
                </View>
                <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center',paddingVertical:8}}>
                  <Text style={{fontSize:14,fontWeight:'700',color:'#1B6B4A'}}>{fr?'À reverser à KribiGo':'To remit to KribiGo'}</Text>
                  <Text style={{fontSize:15,fontWeight:'800',color:'#1B6B4A'}}>{commissionAmt.toLocaleString()} XAF</Text>
                </View>
              </View>
            </View>
            );
          })()}
          {/* Bar chart */}
          <View style={{backgroundColor:'#fff',borderRadius:16,padding:16,marginBottom:20,shadowColor:'#000',shadowOpacity:0.06,shadowRadius:6,elevation:2}}>
            <View style={{flexDirection:'row',alignItems:'flex-end',height:120,gap:6,justifyContent:'space-between'}}>
              {data.map((d,i)=>(
                <View key={i} style={{flex:1,alignItems:'center'}}>
                  <View style={{width:'100%',height:Math.max(4,Math.round((d.amount/maxAmt)*100)),backgroundColor: i===data.length-1?'#1B6B4A':'#C8E6C9',borderRadius:6}}/>
                  <Text style={{fontSize:10,color:'#999',marginTop:4}}>{d.label}</Text>
                </View>
              ))}
            </View>
          </View>
          {/* Summary cards */}
          <View style={{flexDirection:'row',gap:12,marginBottom:20}}>
            <View style={{flex:1,backgroundColor:'#fff',borderRadius:16,padding:16,alignItems:'center',shadowColor:'#000',shadowOpacity:0.06,shadowRadius:6,elevation:2}}>
              <Text style={{fontSize:22}}>{driverVehicle==='moto'?'🏍️':driverVehicle==='economie'?'🚗':'🚙'}</Text>
              <Text style={{fontSize:20,fontWeight:'800',color:'#1B6B4A',marginTop:4}}>{data.length}</Text>
              <Text style={{fontSize:11,color:'#999',marginTop:2}}>{fr?'Courses':'Trips'}</Text>
            </View>
            <View style={{flex:1,backgroundColor:'#fff',borderRadius:16,padding:16,alignItems:'center',shadowColor:'#000',shadowOpacity:0.06,shadowRadius:6,elevation:2}}>
              <Text style={{fontSize:22}}>📊</Text>
              <Text style={{fontSize:20,fontWeight:'800',color:'#1B6B4A',marginTop:4}}>{Math.round(total/data.length).toLocaleString()}</Text>
              <Text style={{fontSize:11,color:'#999',marginTop:2}}>{fr?'Moy/jour':'Avg/day'}</Text>
            </View>
            <View style={{flex:1,backgroundColor:'#fff',borderRadius:16,padding:16,alignItems:'center',shadowColor:'#000',shadowOpacity:0.06,shadowRadius:6,elevation:2}}>
              <Text style={{fontSize:22}}>{getTier(driverTotalTrips).icon}</Text>
              <Text style={{fontSize:20,fontWeight:'800',color:'#1B6B4A',marginTop:4}}>{getTier(driverTotalTrips).commission}%</Text>
              <Text style={{fontSize:11,color:'#999',marginTop:2}}>{fr?'Commission':'Commission'}</Text>
            </View>
          </View>
        </ScrollView>
        );
      })()}

      {/* Bottom Tab Bar */}
      <View style={dr.tabBar}>
        <TouchableOpacity style={dr.tabItem} onPress={()=>setDriverTab('home')}>
          <Text style={[dr.tabIcon, driverTab==='home'&&dr.tabIconActive]}>🏠</Text>
          <Text style={[dr.tabLabel, driverTab==='home'&&dr.tabLabelActive]}>{fr?'Accueil':'Home'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={dr.tabItem} onPress={()=>setDriverTab('trips')}>
          <Text style={[dr.tabIcon, driverTab==='trips'&&dr.tabIconActive]}>📋</Text>
          <Text style={[dr.tabLabel, driverTab==='trips'&&dr.tabLabelActive]}>{fr?'Courses':'Trips'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={dr.tabItem} onPress={()=>setDriverTab('earnings')}>
          <Text style={[dr.tabIcon, driverTab==='earnings'&&dr.tabIconActive]}>💰</Text>
          <Text style={[dr.tabLabel, driverTab==='earnings'&&dr.tabLabelActive]}>{fr?'Gains':'Earnings'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={dr.tabItem} onPress={()=>setDriverTab('profile')}>
          <Text style={[dr.tabIcon, driverTab==='profile'&&dr.tabIconActive]}>👤</Text>
          <Text style={[dr.tabLabel, driverTab==='profile'&&dr.tabLabelActive]}>{fr?'Profil':'Profile'}</Text>
        </TouchableOpacity>
      </View>
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
  const [userId, setUserId] = useState(null);
  const [riderName, setRiderName] = useState('');
  const [riderPhoto, setRiderPhoto] = useState(null);
  const [editingProfile, setEditingProfile] = useState(false);
  const [tempName, setTempName] = useState('');
  const [activeTab, setActiveTab] = useState('home');
  const [tripHistory, setTripHistory] = useState([]);

  useEffect(() => {
    loadSession().then(session => {
      if (session) {
        setPhone(session.phone);
        setUserRole(session.role);
        setToken(session.token);
        setUserId(session.userId);
        if (session.riderName) setRiderName(session.riderName);

        setScreen('home');
      } else {
        setScreen('login');
      }
    });
  }, []);

  const handleRoleSelect = async (r) => {
    await saveToken(token);
    await savePhone(phone);
    await saveRole(r);
    if (userId) await saveUserId(userId);
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
      setDriverInfo({ eta_minutes, ...driver, vehicle_plate: driver.vehicle_plate || 'LT 1234 A', name: driver.name || 'Paul Manga' });
      // Generate 4-digit security PIN
      const pin = String(Math.floor(1000 + Math.random() * 9000));
      setTripPin(pin);
    });
    s.on('trip:completed', () => {
      setTripStatus('completed');
      // Rating shown manually by user tapping the button
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
  const [destCoords, setDestCoords] = useState(null);
  const [realDistanceKm, setRealDistanceKm] = useState(null);
  const [showSpots, setShowSpots] = useState(false);
  const [pickupCoords, setPickupCoords] = useState({ lat: 2.9377, lng: 9.9097 });
  const [pickupAddress, setPickupAddress] = useState('');
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState('moto');
  const [isCourse, setIsCourse] = useState(false);
  const [stopCoords, setStopCoords] = useState([null, null]);
  const [stops, setStops] = useState(['','']);
  const [waitUnits, setWaitUnits] = useState([0,0,0,0]);
  const [showWaitPicker, setShowWaitPicker] = useState(null);
  const [activeStopIndex, setActiveStopIndex] = useState(0);
  const [schedDate, setSchedDate] = useState('');
  const [schedTime, setSchedTime] = useState('');
  const [showCalendar, setShowCalendar] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [bookedRide, setBookedRide] = useState(null);
  const [tripStatus, setTripStatus] = useState('searching'); // searching | accepted | arriving | in_progress | completed
  const [driverInfo, setDriverInfo] = useState(null);
  const [tripPin, setTripPin] = useState(null);
  const [showRating, setShowRating] = useState(false);
  const [userRating, setUserRating] = useState(0);
  const [ratingComment, setRatingComment] = useState('');
  const [ratingSubmitted, setRatingSubmitted] = useState(false);

  const fr = lang === 'fr';
  const schedHour = schedTime ? parseInt(schedTime.split(':')[0]) : null;
  const night = schedHour !== null ? isNightAt(schedHour) : isNightAt(new Date().getHours());
  const fare = calcFare({type:selectedVehicle,isCourse,stops:isCourse?stops:[destination],waitUnits,scheduledHour:schedHour,realDistanceKm});
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
      if(res.ok){ setToken(data.access_token); setUserId(data.user?.id); setScreen('role'); }
      else Alert.alert('Erreur',data.error||'Code invalide');
    } catch {Alert.alert('Erreur','Serveur inaccessible');}
    finally{setLoading(false);}
  };

  const submitRating = async () => {
    if (userRating === 0) { Alert.alert(fr ? 'Erreur' : 'Error', fr ? 'Veuillez choisir une note' : 'Please select a rating'); return; }
    setRatingSubmitted(true);
    setShowRating(false);
    Alert.alert(fr ? '⭐ Merci !' : '⭐ Thank you!', fr ? 'Votre avis a été envoyé au chauffeur' : 'Your rating has been sent to the driver');
    setTimeout(() => { newRide(); setTripStatus('searching'); setDriverInfo(null); setUserRating(0); setRatingComment(''); setRatingSubmitted(false); }, 1500);
  };

  const loadHistory = async () => {
    try {
      const t = token;
      const res = await fetch('https://kribigo-backend.onrender.com/api/v1/trips/history', {
        headers: { 'Authorization': 'Bearer ' + t }
      });
      const data = await res.json();
      if (Array.isArray(data)) setTripHistory(data);
    } catch(e) { console.log('History error:', e.message); }
  };

  const pickPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(fr ? 'Permission requise' : 'Permission required',
        fr ? "Autorisez l'accès à vos photos" : 'Please allow access to your photos');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled) {
      setRiderPhoto(result.assets[0].uri);
      const { saveRiderName } = require('./src/services/storage');
      // Store photo URI in SecureStore
      await SecureStore.setItemAsync('kribigo_rider_photo', result.assets[0].uri);
    }
  };

  // Haversine distance calculator
  const haversineDistance = (lat1, lng1, lat2, lng2) => {
    const R = 6371; // Earth radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return Math.round(R * c * 10) / 10; // km rounded to 1 decimal
  };

  // Load saved photo on startup
  useEffect(() => {
    const { getItemAsync } = require('expo-secure-store');
    getItemAsync('kribigo_rider_photo').then(photo => {
      if (photo) setRiderPhoto(photo);
    }).catch(() => {});
  }, []);

  // Get rider's current location
  useEffect(() => {
    (async () => {
      setLoadingLocation(true);
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setPickupAddress(fr ? 'Centre Ville, Kribi' : 'Centre Ville, Kribi');
          setLoadingLocation(false);
          return;
        }
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        const { latitude, longitude } = loc.coords;
        setPickupCoords({ lat: latitude, lng: longitude });
        
        // Reverse geocode to get address
        const geo = await Location.reverseGeocodeAsync({ latitude, longitude });
        if (geo[0]) {
          const addr = [geo[0].street, geo[0].district, geo[0].city].filter(Boolean).join(', ');
          setPickupAddress(addr || 'Ma position actuelle');
        } else {
          setPickupAddress('Ma position actuelle');
        }
      } catch(e) {
        setPickupAddress('Centre Ville, Kribi');
      } finally {
        setLoadingLocation(false);
      }
    })();
  }, []);

  const confirmBooking = () => {
    setBookedRide({vehicle,destination:isCourse?stops.filter(s=>s.trim()).join(' → '):destination,fare,isCourse,isScheduled:rideMode==='later',schedDate,schedTime,night,destLat:destCoords?.lat||2.9200,destLng:destCoords?.lng||9.9150,pickupLat:pickupCoords.lat,pickupLng:pickupCoords.lng,pickupAddress:pickupAddress||'Ma position actuelle'});
    setShowConfirm(false);
    setShowSuccess(true);
    // Join rider socket room so we receive driver updates
    const s = connectSocket();
    joinAsRider(userId);
    console.log('👤 Joined rider room:', userId);
  };

  const newRide = () => {
    setShowRating(false);
    setShowSuccess(false);
    setDestination('');
    setStops(['','']);
    setWaitUnits([0,0,0,0]);
    setIsCourse(false);
    setStopCoords([null, null]);
    setRideMode('now');
    setSchedDate('');
    setSchedTime('');
    setTripStatus('searching');
    setDriverInfo(null);
    setTripPin(null);
    setRealDistanceKm(null);
    setDestCoords(null);
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
          <View>
            <View style={[tk.statusCard, tk.statusCardGreen]}>
              <Text style={tk.statusIcon}>🚗</Text>
              <Text style={[tk.statusTitle,{color:'#fff'}]}>{fr ? 'Chauffeur trouvé !' : 'Driver found!'}</Text>
              <Text style={[tk.statusSub,{color:'rgba(255,255,255,0.85)'}]}>{fr ? 'En route vers vous' : 'On the way to you'}</Text>
            </View>

            {/* Security PIN Card */}
            <View style={pin.pinCard}>
              <View style={pin.pinHeader}>
                <Text style={pin.pinHeaderIcon}>🔐</Text>
                <View>
                  <Text style={pin.pinHeaderTitle}>{fr ? 'Code de sécurité' : 'Security code'}</Text>
                  <Text style={pin.pinHeaderSub}>{fr ? 'Montrez ce code à votre chauffeur' : 'Show this code to your driver'}</Text>
                </View>
              </View>
              <View style={pin.pinDisplay}>
                {tripPin && tripPin.split('').map((digit, i) => (
                  <View key={i} style={pin.pinDigit}>
                    <Text style={pin.pinDigitText}>{digit}</Text>
                  </View>
                ))}
              </View>
              <Text style={pin.pinNote}>{fr ? "⚠️ Ne montrez ce code qu'une fois dans le véhicule" : '⚠️ Only show this code once inside the vehicle'}</Text>
            </View>

            {/* License plate card */}
            {driverInfo?.vehicle_plate && (
              <View style={pin.plateCard}>
                <Text style={pin.plateLabel}>{fr ? "🚗 Vérifiez la plaque d'immatriculation" : '🚗 Check the license plate'}</Text>
                <View style={pin.plateBadge}>
                  <Text style={pin.plateBadgeText}>{driverInfo.vehicle_plate}</Text>
                </View>
                <Text style={pin.plateNote}>{fr ? 'Ne montez pas dans un véhicule avec une plaque différente' : 'Do not enter a vehicle with a different plate'}</Text>
              </View>
            )}

            <TouchableOpacity
              style={{backgroundColor:'rgba(255,255,255,0.15)',margin:16,borderRadius:16,padding:16,alignItems:'center',borderWidth:1.5,borderColor:'rgba(255,255,255,0.3)'}}
              onPress={() => { setTripStatus('completed'); setShowRating(true); }}>
              <Text style={{color:'#fff',fontWeight:'800',fontSize:15}}>✅ {fr ? 'Simuler fin de course' : 'Simulate trip end'}</Text>
            </TouchableOpacity>
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
          <View>
            <TouchableOpacity style={s.newRideBtn} onPress={()=>{ setShowSuccess(false); setShowRating(true); }}>
              <Text style={s.newRideBtnText}>⭐ {fr?'Noter le chauffeur':'Rate driver'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.newRideBtn,{marginTop:8,backgroundColor:'rgba(255,255,255,0.1)'}]} onPress={()=>newRide()}>
              <Text style={s.newRideBtnText}>{fr?'+ Nouvelle course':'+ New ride'}</Text>
            </TouchableOpacity>
          </View>
        ):tripStatus==='searching'?(
          <TouchableOpacity style={[s.newRideBtn,{backgroundColor:'rgba(255,255,255,0.1)'}]} onPress={()=>{newRide();setTripStatus('searching');}}>
            <Text style={s.newRideBtnText}>{fr?'Annuler':'Cancel'}</Text>
          </TouchableOpacity>
        ):null}
        <View style={{height:40}}/>
      </ScrollView>
    </View>
  );

  // Rating modal at app level
  if (showRating && !showSuccess) return (
    <View style={s.container}>
      <ScrollView contentContainerStyle={{flexGrow:1, justifyContent:'center', padding:24}}>
        <View style={rt.modal}>
          <Text style={rt.title}>{fr ? 'Notez votre chauffeur' : 'Rate your driver'}</Text>
          <View style={rt.driverRow}>
            <View style={rt.avatar}><Text style={{fontSize:32}}>👨‍✈️</Text></View>
            <View>
              <Text style={rt.driverName}>{driverInfo?.name || 'Chauffeur KribiGo'}</Text>
              <Text style={rt.driverSub}>{bookedRide?.vehicle?.icon} {fr ? bookedRide?.vehicle?.label_fr : bookedRide?.vehicle?.label_en}</Text>
            </View>
          </View>
          <Text style={rt.starsLabel}>{fr ? 'Comment était votre course ?' : 'How was your ride?'}</Text>
          <View style={rt.starsRow}>
            {[1,2,3,4,5].map(star => (
              <TouchableOpacity key={star} onPress={() => setUserRating(star)} style={rt.starBtn}>
                <Text style={[rt.star, userRating >= star && rt.starActive]}>{userRating >= star ? '⭐' : '☆'}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={rt.ratingLabel}>
            {userRating === 0 ? '' : userRating === 1 ? (fr?'Très mauvais':'Very bad') : userRating === 2 ? (fr?'Mauvais':'Bad') : userRating === 3 ? (fr?'Correct':'OK') : userRating === 4 ? (fr?'Bien':'Good') : (fr?'Excellent !':'Excellent!')}
          </Text>
          <TextInput
            style={rt.comment}
            placeholder={fr ? "Ajouter un commentaire (optionnel)..." : "Add a comment (optional)..."}
            placeholderTextColor="#999"
            value={ratingComment}
            onChangeText={setRatingComment}
            multiline
            numberOfLines={3}
          />
          <TouchableOpacity style={[rt.submitBtn, userRating===0 && rt.submitBtnOff]} onPress={submitRating} disabled={userRating===0}>
            <Text style={rt.submitBtnText}>{fr ? 'Envoyer ma note' : 'Submit rating'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={rt.skipBtn} onPress={() => { setShowRating(false); newRide(); setTripStatus('searching'); setDriverInfo(null); }}>
            <Text style={rt.skipBtnText}>{fr ? 'Passer' : 'Skip'}</Text>
          </TouchableOpacity>
        </View>
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

      <ScrollView style={s.homeScroll} keyboardShouldPersistTaps="handled" nestedScrollEnabled={true}>
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

        {/* Current location display */}
        <View style={[s.destCard, {marginBottom:8}]}>
          <Text style={s.destLabel}>📍 {fr?'Prise en charge':'Pickup'}</Text>
          <View style={{flexDirection:'row', alignItems:'center', padding:12, backgroundColor:'#F0F7F4', borderRadius:12}}>
            <Text style={{fontSize:16, marginRight:8}}>📍</Text>
            <Text style={{flex:1, fontSize:14, color:'#1B6B4A', fontWeight:'600'}} numberOfLines={1}>
              {loadingLocation ? (fr?'Détection de votre position...':'Detecting your location...') : (pickupAddress || 'Ma position actuelle')}
            </Text>
            {loadingLocation && <ActivityIndicator size="small" color="#1B6B4A"/>}
          </View>
        </View>

        <View style={s.destCard}>
          {!isCourse?(
            <>
              <Text style={s.destLabel}>📍 {fr?'Destination':'Destination'}</Text>
              {/* Quick spots button */}
              <TouchableOpacity
                style={{flexDirection:'row',alignItems:'center',marginBottom:8,padding:8}}
                onPress={() => setShowSpots(!showSpots)}>
                <Text style={{fontSize:13,color:'#1B6B4A',fontWeight:'700'}}>
                  📍 {fr ? 'Lieux populaires à Kribi' : 'Popular spots in Kribi'} {showSpots ? '▲' : '▼'}
                </Text>
              </TouchableOpacity>

              {showSpots && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom:8}} keyboardShouldPersistTaps="handled">
                  <View style={{flexDirection:'row',gap:8,paddingBottom:4}}>
                    {KRIBI_SPOTS.map((spot, i) => (
                      <TouchableOpacity
                        key={i}
                        style={{backgroundColor:'#F0F7F4',borderRadius:20,paddingHorizontal:12,paddingVertical:8,borderWidth:1,borderColor:'#C8E6C9',alignItems:'center',minWidth:100}}
                        onPress={() => {
                          setDestination(spot.name);
                          setDestCoords({ lat: spot.lat, lng: spot.lng });
                          const dist = haversineDistance(pickupCoords.lat, pickupCoords.lng, spot.lat, spot.lng);
                          setRealDistanceKm(dist);
                          setShowSpots(false);
                        }}>
                        <Text style={{fontSize:20}}>{spot.icon}</Text>
                        <Text style={{fontSize:10,color:'#1B6B4A',fontWeight:'600',textAlign:'center',marginTop:2}} numberOfLines={2}>{spot.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              )}

              {destination && destCoords && !showSpots ? (
                <TouchableOpacity
                  onPress={() => { setDestination(''); setDestCoords(null); setRealDistanceKm(null); }}
                  style={{flexDirection:'row', alignItems:'center', backgroundColor:'#F0F7F4', borderRadius:12, padding:14, marginBottom:4}}>
                  <Text style={{flex:1, fontSize:15, color:'#1B6B4A', fontWeight:'600'}} numberOfLines={1}>{destination}</Text>
                  <Text style={{color:'#999', fontSize:16, marginLeft:8}}>✕</Text>
                </TouchableOpacity>
              ) : null}

              <GooglePlacesAutocomplete
                placeholder={fr?'Entrez votre destination...':'Enter destination...'}
                onPress={(data, details = null) => {
                  setDestination(data.description);
                  if (details?.geometry?.location) {
                    const newCoords = {
                      lat: details.geometry.location.lat,
                      lng: details.geometry.location.lng,
                    };
                    setDestCoords(newCoords);
                    // Calculate real distance
                    const dist = haversineDistance(
                      pickupCoords.lat, pickupCoords.lng,
                      newCoords.lat, newCoords.lng
                    );
                    console.log('📏 Real distance:', dist, 'km');
                    setRealDistanceKm(dist);
                  }
                }}
                query={{
                  key: 'AIzaSyDnzBFjbB2dNIgiKhbfyazJpxXxNyzNwpQ',
                  language: fr ? 'fr' : 'en',
                  location: '2.9377,9.9097',
                  radius: '50000',
                  components: 'country:cm',
                }}
                fetchDetails={true}
                enablePoweredByContainer={false}
                listViewDisplayed="auto"
                nestedScrollEnabled={true}
                keyboardShouldPersistTaps="handled"
                styles={{
                  textInput: s.destInput,
                  listView: {backgroundColor:'#fff', borderRadius:12, marginTop:4, elevation:5, shadowColor:'#000', shadowOpacity:0.1, shadowRadius:8},
                  row: {padding:14, borderBottomWidth:1, borderBottomColor:'#F0F0F0'},
                  description: {fontSize:14, color:'#333'},
                }}
              />
            </>
          ):(
            <>
              <Text style={s.destLabel}>🔄 {fr?'Arrêts de la course':'Course stops'}</Text>
              <TouchableOpacity
                style={{flexDirection:'row',alignItems:'center',marginBottom:8,padding:8}}
                onPress={() => setShowSpots(!showSpots)}>
                <Text style={{fontSize:13,color:'#1B6B4A',fontWeight:'700'}}>
                  📍 {fr ? 'Lieux populaires à Kribi' : 'Popular spots in Kribi'} {showSpots ? '▲' : '▼'}
                </Text>
              </TouchableOpacity>
              {showSpots && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom:8}} keyboardShouldPersistTaps="handled">
                  <View style={{flexDirection:'row',gap:8,paddingBottom:4}}>
                    {KRIBI_SPOTS.map((spot, si) => (
                      <TouchableOpacity
                        key={si}
                        style={{backgroundColor:'#F0F7F4',borderRadius:20,paddingHorizontal:12,paddingVertical:8,borderWidth:1,borderColor:'#C8E6C9',alignItems:'center',minWidth:100}}
                        onPress={() => {
                          const ns=[...stops]; ns[activeStopIndex]=spot.name; setStops(ns);
                          const nc=[...stopCoords]; nc[activeStopIndex]={lat:spot.lat,lng:spot.lng}; setStopCoords(nc);
                          const dist=haversineDistance(pickupCoords.lat,pickupCoords.lng,spot.lat,spot.lng);
                          setRealDistanceKm(dist);
                          setShowSpots(false);
                        }}>
                        <Text style={{fontSize:20}}>{spot.icon}</Text>
                        <Text style={{fontSize:10,color:'#1B6B4A',fontWeight:'600',textAlign:'center',marginTop:2}} numberOfLines={2}>{spot.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              )}
              {stops.map((stop,i)=>(
                <View key={i}>
                  <View style={{flexDirection:'row',alignItems:'flex-start',marginBottom:4}}>
                    <View style={s.stopBadge}><Text style={s.stopBadgeText}>{i+1}</Text></View>
                    <View style={{flex:1}}>
                      {stopCoords[i] ? (
                        <TouchableOpacity
                          onPress={() => {
                            const ns=[...stops]; ns[i]=''; setStops(ns);
                            const nc=[...stopCoords]; nc[i]=null; setStopCoords(nc);
                            setRealDistanceKm(null);
                          }}
                          style={{flexDirection:'row',alignItems:'center',backgroundColor:'#F0F7F4',borderRadius:12,padding:12,marginBottom:4}}>
                          <Text style={{flex:1,fontSize:14,color:'#1B6B4A',fontWeight:'600'}} numberOfLines={1}>{stop}</Text>
                          <Text style={{color:'#999',fontSize:16,marginLeft:8}}>✕</Text>
                        </TouchableOpacity>
                      ) : (
                        <GooglePlacesAutocomplete
                          placeholder={i===0?(fr?'Premier arrêt...':'First stop...'):i===stops.length-1?(fr?'Dernier arrêt...':'Last stop...'):(fr?('Arrêt '+(i+1)+'...'):('Stop '+(i+1)+'...'))}
                          textInputProps={{onFocus:()=>setActiveStopIndex(i)}}
                          onPress={(data, details=null) => {
                            const ns=[...stops]; ns[i]=data.description; setStops(ns);
                            if(details?.geometry?.location){
                              const nc=[...stopCoords]; nc[i]={lat:details.geometry.location.lat,lng:details.geometry.location.lng}; setStopCoords(nc);
                              if(i===0){
                                const dist=haversineDistance(pickupCoords.lat,pickupCoords.lng,details.geometry.location.lat,details.geometry.location.lng);
                                setRealDistanceKm(dist);
                              }
                            }
                          }}
                          query={{key:'AIzaSyDnzBFjbB2dNIgiKhbfyazJpxXxNyzNwpQ',language:fr?'fr':'en',location:'2.9377,9.9097',radius:'50000',components:'country:cm'}}
                          fetchDetails={true}
                          enablePoweredByContainer={false}
                          listViewDisplayed="auto"
                          keyboardShouldPersistTaps="handled"
                          styles={{
                            textInput:s.destInput,
                            listView:{backgroundColor:'#fff',borderRadius:12,marginTop:4,elevation:5,shadowColor:'#000',shadowOpacity:0.1,shadowRadius:8},
                            row:{padding:14,borderBottomWidth:1,borderBottomColor:'#F0F0F0'},
                            description:{fontSize:14,color:'#333'},
                          }}
                        />
                      )}
                    </View>
                    {stops.length>2&&<TouchableOpacity onPress={()=>{
                      setStops(stops.filter((_,idx)=>idx!==i));
                      setStopCoords(stopCoords.filter((_,idx)=>idx!==i));
                    }} style={[s.removeBtn,{marginTop:10}]}><Text style={s.removeBtnText}>✕</Text></TouchableOpacity>}
                  </View>

                </View>
              ))}
              {stops.length<MAX_STOPS&&<TouchableOpacity style={s.addStopBtn} onPress={()=>{setStops([...stops,'']);setStopCoords([...stopCoords,null]);}}><Text style={s.addStopText}>+ {fr?('Ajouter un arrêt (max '+MAX_STOPS+')'):('Add stop (max '+MAX_STOPS+')')}</Text></TouchableOpacity>}
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

              <View style={{backgroundColor:'#FFF8E1',borderRadius:12,padding:12,marginTop:8,marginBottom:4,flexDirection:'row',alignItems:'flex-start'}}>
                <Text style={{fontSize:16,marginRight:8}}>⏱️</Text>
                <Text style={{fontSize:12,color:'#7B5E00',flex:1,lineHeight:18}}>{fr?'Temps d\'attente : +500 XAF toutes les 15 min, ajouté automatiquement par le chauffeur.':'Wait time: +500 XAF every 15 min, added automatically by the driver.'}</Text>
              </View>

        <Text style={s.sectionTitle}>{fr?'Choisissez votre véhicule':'Choose your vehicle'}</Text>
        {VEHICLES.map(v=>{
          const vFare=calcFare({type:v.id,isCourse,stops:isCourse?stops:[destination],waitUnits,scheduledHour:schedHour,realDistanceKm});
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
        <View style={{height:80}}/>
      </ScrollView>

      {/* Bottom Tab Bar */}
      <View style={tab.bar}>
        <TouchableOpacity style={tab.btn} onPress={() => setActiveTab('home')}>
          <Text style={[tab.icon, activeTab==='home' && tab.iconActive]}>🏠</Text>
          <Text style={[tab.label, activeTab==='home' && tab.labelActive]}>{fr ? 'Accueil' : 'Home'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={tab.btn} onPress={() => { setActiveTab('history'); loadHistory(); }}>
          <Text style={[tab.icon, activeTab==='history' && tab.iconActive]}>📋</Text>
          <Text style={[tab.label, activeTab==='history' && tab.labelActive]}>{fr ? 'Courses' : 'Trips'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={tab.btn} onPress={() => setActiveTab('profile')}>
          <Text style={[tab.icon, activeTab==='profile' && tab.iconActive]}>👤</Text>
          <Text style={[tab.label, activeTab==='profile' && tab.labelActive]}>{fr ? 'Profil' : 'Profile'}</Text>
        </TouchableOpacity>
      </View>

      {/* History Tab */}
      {activeTab === 'history' && (
        <TouchableOpacity activeOpacity={1} style={tab.overlay} onPress={() => setActiveTab('home')}>
          <View style={tab.sheet}>
            <View style={tab.sheetHandle}/>
            <Text style={tab.sheetTitle}>{fr ? 'Mes courses' : 'My trips'}</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {tripHistory.length === 0 ? (
                <View style={tab.empty}>
                  <Text style={tab.emptyIcon}>🚗</Text>
                  <Text style={tab.emptyText}>{fr ? "Aucune course pour l'instant" : 'No trips yet'}</Text>
                </View>
              ) : tripHistory.map((trip, i) => (
                <View key={trip.id} style={tab.tripCard}>
                  <View style={tab.tripLeft}>
                    <Text style={tab.tripIcon}>
                      {trip.vehicle_type === 'moto' ? '🏍️' : trip.vehicle_type === 'economie' ? '🚗' : '❄️'}
                    </Text>
                  </View>
                  <View style={tab.tripInfo}>
                    <Text style={tab.tripDest} numberOfLines={1}>{trip.dest_address}</Text>
                    <Text style={tab.tripDate}>{new Date(trip.requested_at).toLocaleDateString('fr-FR', {day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}</Text>
                    <View style={[tab.tripStatus, {backgroundColor: trip.status==='completed'?'#E8F5E9':trip.status==='cancelled'?'#FFEBEE':'#FFF8E1'}]}>
                      <Text style={[tab.tripStatusText, {color: trip.status==='completed'?'#2E7D32':trip.status==='cancelled'?'#C62828':'#F57F17'}]}>
                        {trip.status==='completed'?(fr?'Terminée':'Completed'):trip.status==='cancelled'?(fr?'Annulée':'Cancelled'):(fr?'En cours':'In progress')}
                      </Text>
                    </View>
                  </View>
                  <View style={tab.tripFare}>
                    <Text style={tab.tripFareText}>{(trip.final_fare||trip.estimated_fare||0).toLocaleString()}</Text>
                    <Text style={tab.tripFareCur}>XAF</Text>
                  </View>
                </View>
              ))}
              <View style={{height:40}}/>
            </ScrollView>
          </View>
        </TouchableOpacity>
      )}

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <TouchableOpacity activeOpacity={1} style={tab.overlay} onPress={() => setActiveTab('home')}>
          <View style={tab.sheet}>
            <View style={tab.sheetHandle}/>
            <Text style={tab.sheetTitle}>{fr ? 'Mon profil' : 'My profile'}</Text>
            <View style={tab.profileCard}>
              <TouchableOpacity style={tab.profileAvatar} onPress={pickPhoto}>
                {riderPhoto ? (
                  <Image source={{uri: riderPhoto}} style={{width:80, height:80, borderRadius:40}}/>
                ) : (
                  <Text style={{fontSize:40}}>👤</Text>
                )}
                <View style={{position:'absolute',bottom:0,right:0,backgroundColor:'#1B6B4A',borderRadius:10,padding:3}}>
                  <Text style={{fontSize:12}}>📷</Text>
                </View>
              </TouchableOpacity>
              {editingProfile ? (
                <View style={{width:'100%',alignItems:'center'}}>
                  <TextInput
                    style={{backgroundColor:'#fff',borderRadius:12,padding:12,fontSize:16,fontWeight:'700',textAlign:'center',width:200,marginBottom:8,borderWidth:1,borderColor:'#1B6B4A'}}
                    value={tempName}
                    onChangeText={setTempName}
                    placeholder={fr?'Votre prénom...':'Your name...'}
                    placeholderTextColor="#999"
                    autoFocus
                  />
                  <View style={{flexDirection:'row',gap:8}}>
                    <TouchableOpacity onPress={async ()=>{
                      setRiderName(tempName);
                      setEditingProfile(false);
                      const { saveRiderName } = require('./src/services/storage');
                      await saveRiderName(tempName);
                    }} style={{backgroundColor:'#1B6B4A',borderRadius:10,paddingHorizontal:16,paddingVertical:8}}>
                      <Text style={{color:'#fff',fontWeight:'700'}}>{fr?'Enregistrer':'Save'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={()=>setEditingProfile(false)} style={{backgroundColor:'#F5F5F5',borderRadius:10,paddingHorizontal:16,paddingVertical:8}}>
                      <Text style={{color:'#888',fontWeight:'700'}}>{fr?'Annuler':'Cancel'}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <TouchableOpacity onPress={()=>{setTempName(riderName);setEditingProfile(true);}}>
                  <Text style={tab.profilePhone}>{riderName || '+237 ' + phone}</Text>
                  <Text style={[tab.profileSub,{color:'#1B6B4A'}]}>{riderName ? '+237 ' + phone : (fr?'✏️ Ajouter votre nom':'✏️ Add your name')}</Text>
                </TouchableOpacity>
              )}
            </View>
            <View style={tab.profileStats}>
              <View style={tab.profileStat}>
                <Text style={tab.profileStatNum}>{tripHistory.filter(t=>t.status==='completed').length}</Text>
                <Text style={tab.profileStatLabel}>{fr?'Courses':'Trips'}</Text>
              </View>
              <View style={tab.profileStat}>
                <Text style={tab.profileStatNum}>⭐ 5.0</Text>
                <Text style={tab.profileStatLabel}>{fr?'Note':'Rating'}</Text>
              </View>
              <View style={tab.profileStat}>
                <Text style={tab.profileStatNum}>{Math.max(0, 10 - (tripHistory.filter(t=>t.status==='completed').length % 10))}</Text>
                <Text style={tab.profileStatLabel}>{fr?'→ Gratuite':'→ Free'}</Text>
              </View>
            </View>
            <TouchableOpacity style={tab.logoutBtn} onPress={handleLogout}>
              <Text style={tab.logoutBtnText}>{fr ? '🚪 Se déconnecter' : '🚪 Log out'}</Text>
            </TouchableOpacity>
            <View style={{height:40}}/>
          </View>
        </TouchableOpacity>
      )}
    </View>
  );
}

const GREEN='#1B6B4A', ORANGE='#F4A827';




const pin = StyleSheet.create({
  pinCard:{backgroundColor:'#fff',marginHorizontal:16,marginTop:12,borderRadius:20,padding:20,shadowColor:'#000',shadowOpacity:0.1,shadowRadius:12,elevation:5},
  pinHeader:{flexDirection:'row',alignItems:'center',marginBottom:16},
  pinHeaderIcon:{fontSize:28,marginRight:12},
  pinHeaderTitle:{fontSize:16,fontWeight:'800',color:'#1B6B4A'},
  pinHeaderSub:{fontSize:12,color:'#888',marginTop:2},
  pinDisplay:{flexDirection:'row',justifyContent:'center',gap:12,marginBottom:14},
  pinDigit:{width:56,height:64,borderRadius:14,backgroundColor:'#1B6B4A',alignItems:'center',justifyContent:'center',shadowColor:'#1B6B4A',shadowOpacity:0.3,shadowRadius:6,elevation:3},
  pinDigitText:{fontSize:32,fontWeight:'900',color:'#fff'},
  pinNote:{fontSize:11,color:'#E53935',textAlign:'center',fontWeight:'600'},
  plateCard:{backgroundColor:'#FFF8E1',marginHorizontal:16,marginTop:10,borderRadius:16,padding:16,borderWidth:1.5,borderColor:'#F4A827'},
  plateLabel:{fontSize:13,fontWeight:'700',color:'#7A5200',marginBottom:10},
  plateBadge:{backgroundColor:'#1E293B',borderRadius:10,paddingVertical:10,paddingHorizontal:20,alignSelf:'center',marginBottom:8},
  plateBadgeText:{fontSize:22,fontWeight:'900',color:'#fff',letterSpacing:4,fontFamily:'monospace'},
  plateNote:{fontSize:11,color:'#7A5200',textAlign:'center',fontStyle:'italic'},
});

const tab = StyleSheet.create({
  bar:{flexDirection:'row',backgroundColor:'#fff',borderTopWidth:1,borderTopColor:'#E0E0E0',paddingBottom:20,paddingTop:10,position:'absolute',bottom:0,left:0,right:0},
  btn:{flex:1,alignItems:'center'},
  icon:{fontSize:22},
  iconActive:{},
  label:{fontSize:11,color:'#999',marginTop:2},
  labelActive:{color:'#1B6B4A',fontWeight:'700'},
  overlay:{position:'absolute',top:0,left:0,right:0,bottom:0,backgroundColor:'rgba(0,0,0,0.5)',zIndex:50,justifyContent:'flex-end'},
  sheet:{backgroundColor:'#fff',borderTopLeftRadius:28,borderTopRightRadius:28,padding:24,maxHeight:'85%'},
  sheetHandle:{width:40,height:4,backgroundColor:'#E0E0E0',borderRadius:2,alignSelf:'center',marginBottom:20},
  sheetTitle:{fontSize:20,fontWeight:'900',color:'#333',marginBottom:20},
  empty:{alignItems:'center',padding:40},
  emptyIcon:{fontSize:48,marginBottom:12},
  emptyText:{fontSize:16,color:'#888',textAlign:'center'},
  tripCard:{flexDirection:'row',alignItems:'center',padding:16,borderRadius:16,backgroundColor:'#F5F6FA',marginBottom:10},
  tripLeft:{marginRight:14},
  tripIcon:{fontSize:28},
  tripInfo:{flex:1},
  tripDest:{fontSize:15,fontWeight:'700',color:'#333',marginBottom:4},
  tripDate:{fontSize:12,color:'#888',marginBottom:6},
  tripStatus:{borderRadius:20,paddingHorizontal:10,paddingVertical:3,alignSelf:'flex-start'},
  tripStatusText:{fontSize:11,fontWeight:'700'},
  tripFare:{alignItems:'flex-end'},
  tripFareText:{fontSize:16,fontWeight:'900',color:'#1B6B4A'},
  tripFareCur:{fontSize:11,color:'#888'},
  profileCard:{alignItems:'center',padding:24,backgroundColor:'#F0F7F4',borderRadius:20,marginBottom:16},
  profileAvatar:{width:80,height:80,borderRadius:40,backgroundColor:'#C8E6C9',alignItems:'center',justifyContent:'center',marginBottom:12},
  profilePhone:{fontSize:18,fontWeight:'800',color:'#333'},
  profileSub:{fontSize:13,color:'#888',marginTop:4},
  profileStats:{flexDirection:'row',backgroundColor:'#F5F6FA',borderRadius:16,padding:16,marginBottom:16},
  profileStat:{flex:1,alignItems:'center'},
  profileStatNum:{fontSize:20,fontWeight:'900',color:'#1B6B4A'},
  profileStatLabel:{fontSize:11,color:'#888',marginTop:4},
  logoutBtn:{backgroundColor:'#FFE5E5',borderRadius:14,padding:16,alignItems:'center'},
  logoutBtnText:{color:'#E53935',fontWeight:'800',fontSize:15},
});

const rt = StyleSheet.create({
  modal:{backgroundColor:'#fff',borderTopLeftRadius:28,borderTopRightRadius:28,padding:28},
  title:{fontSize:22,fontWeight:'900',color:'#1B6B4A',marginBottom:20,textAlign:'center'},
  driverRow:{flexDirection:'row',alignItems:'center',backgroundColor:'#F5F6FA',borderRadius:16,padding:16,marginBottom:20},
  avatar:{width:52,height:52,borderRadius:26,backgroundColor:'#E8F5E9',alignItems:'center',justifyContent:'center',marginRight:14},
  driverName:{fontSize:16,fontWeight:'800',color:'#333'},
  driverSub:{fontSize:13,color:'#888',marginTop:2},
  starsLabel:{fontSize:15,fontWeight:'700',color:'#333',textAlign:'center',marginBottom:12},
  starsRow:{flexDirection:'row',justifyContent:'center',marginBottom:8},
  starBtn:{padding:8},
  star:{fontSize:36,color:'#ddd'},
  starActive:{color:'#F4A827'},
  ratingLabel:{fontSize:14,fontWeight:'700',color:'#F4A827',textAlign:'center',marginBottom:16,height:20},
  comment:{backgroundColor:'#F5F5F5',borderRadius:12,padding:14,fontSize:15,color:'#222',marginBottom:16,minHeight:80,textAlignVertical:'top'},
  submitBtn:{backgroundColor:'#1B6B4A',borderRadius:14,padding:18,alignItems:'center',marginBottom:8,shadowColor:'#1B6B4A',shadowOpacity:0.3,shadowRadius:8,elevation:4},
  submitBtnOff:{opacity:0.4},
  submitBtnText:{color:'#fff',fontWeight:'800',fontSize:16},
  skipBtn:{padding:14,alignItems:'center'},
  skipBtnText:{color:'#888',fontWeight:'600',fontSize:14},
});

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
  searchingBadge:{backgroundColor:'#E8F5EE',marginHorizontal:16,marginTop:8,borderRadius:12,padding:12,alignItems:'center',flexDirection:'row',justifyContent:'center'},
  searchingText:{color:'#1B6B4A',fontWeight:'700',fontSize:14},
  tripStatusCard:{backgroundColor:'#fff',marginHorizontal:16,marginTop:8,borderRadius:16,padding:20,shadowColor:'#000',shadowOpacity:0.08,shadowRadius:8,shadowOffset:{width:0,height:2},elevation:3},
  tripStatusIcon:{fontSize:36,textAlign:'center',marginBottom:6},
  tripStatusTitle:{fontSize:17,fontWeight:'700',color:'#1a1a1a',textAlign:'center',marginBottom:4},
  tripStatusSub:{fontSize:13,color:'#666',textAlign:'center',marginBottom:16},
  arrivedBtn:{backgroundColor:'#1B6B4A',borderRadius:12,paddingVertical:14,paddingHorizontal:24,alignItems:'center'},
  arrivedBtnText:{color:'#fff',fontWeight:'700',fontSize:15},
  tabBar:{flexDirection:'row',backgroundColor:'#fff',borderTopWidth:1,borderTopColor:'#E0E0E0',paddingBottom:20,paddingTop:10,position:'absolute',bottom:0,left:0,right:0},
  tabItem:{flex:1,alignItems:'center'},
  tabIcon:{fontSize:22},
  tabIconActive:{},
  tabLabel:{fontSize:11,color:'#999',marginTop:2},
  tabLabelActive:{color:'#1B6B4A',fontWeight:'700'},
  tripHistCard:{backgroundColor:'#fff',borderRadius:16,padding:16,marginBottom:12,shadowColor:'#000',shadowOpacity:0.06,shadowRadius:6,shadowOffset:{width:0,height:2},elevation:2},
  tripHistHeader:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:10},
  tripHistDate:{fontSize:12,color:'#999'},
  tripHistBadge:{borderRadius:20,paddingHorizontal:10,paddingVertical:3},
  tripHistBadgeText:{fontSize:11,fontWeight:'700'},
  tripHistRow:{flexDirection:'row',alignItems:'center',gap:8,marginBottom:4},
  tripHistAddr:{fontSize:14,color:'#333',flex:1},
  tripHistFooter:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginTop:8,paddingTop:8,borderTopWidth:1,borderTopColor:'#F0F0F0'},
  tripHistVehicle:{fontSize:13,color:'#666'},
  tripHistFare:{fontSize:16,fontWeight:'800',color:'#1B6B4A'},
  profilePhoto:{width:100,height:100,borderRadius:50},
  profilePhotoPlaceholder:{width:100,height:100,borderRadius:50,backgroundColor:'#F0F7F4',alignItems:'center',justifyContent:'center',borderWidth:2,borderColor:'#C8E6C9',borderStyle:'dashed'},
  profileLabel:{fontSize:13,fontWeight:'700',color:'#222',marginBottom:6,marginTop:14},
  profileInput:{backgroundColor:'#F8F8F8',borderRadius:12,padding:14,fontSize:15,color:'#1a1a1a',borderWidth:1,borderColor:'#E0E0E0'},
  profileInputDisabled:{backgroundColor:'#F0F0F0',borderRadius:12,padding:14,borderWidth:1,borderColor:'#E0E0E0'},
  pinModal:{backgroundColor:'#fff',borderRadius:24,padding:28,margin:24,alignItems:'center'},
  pinTitle:{fontSize:20,fontWeight:'800',color:'#1a1a1a',marginBottom:6},
  pinSub:{fontSize:13,color:'#666',marginBottom:20,textAlign:'center'},
  pinDisplay:{flexDirection:'row',gap:16,marginBottom:12},
  pinDot:{width:18,height:18,borderRadius:9,borderWidth:2,borderColor:'#1B6B4A'},
  pinDotFilled:{backgroundColor:'#1B6B4A'},
  pinError:{color:'#e53e3e',fontSize:13,marginBottom:8},
  numpad:{flexDirection:'row',flexWrap:'wrap',width:240,marginTop:8},
  numKey:{width:80,height:64,alignItems:'center',justifyContent:'center'},
  numKeyText:{fontSize:24,fontWeight:'600',color:'#1a1a1a'},
  pinCancelBtn:{marginTop:16,padding:12},
  pinCancelText:{color:'#999',fontSize:14},
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
