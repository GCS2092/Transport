# 🚗 AMÉLIORATIONS DASHBOARD CHAUFFEUR + LOCALISATION

## 📊 SITUATION ACTUELLE

### Dashboard chauffeur existant
❌ **Pas encore implémenté** - Seul le dashboard admin existe
❌ Pas de localisation en temps réel
❌ Pas de suivi de trajet
❌ Pas de navigation GPS

---

## 💡 PROPOSITIONS D'AMÉLIORATIONS

### 🔥 PRIORITÉ HAUTE - Dashboard Chauffeur de Base

#### 1. **Vue d'ensemble des courses**
**Page :** `/driver/dashboard`

**Sections :**
- ✅ **Courses assignées** (ASSIGNEE)
  - Prochaine course à effectuer
  - Détails client (nom, téléphone)
  - Heure de pickup
  - Trajet (départ → arrivée)
  - Bouton "Démarrer la course"

- ✅ **Course en cours** (EN_COURS)
  - Informations client
  - Trajet en cours
  - Carte avec itinéraire
  - Bouton "Terminer la course"

- ✅ **Historique du jour**
  - Courses terminées aujourd'hui
  - Total des revenus du jour
  - Nombre de courses effectuées

**Statistiques rapides :**
- 💰 Revenus du jour
- 📊 Nombre de courses (jour/semaine/mois)
- ⭐ Note moyenne (si système d'évaluation)
- 🕐 Temps de travail

---

#### 2. **Gestion du statut**
**Bouton de statut :**
- 🟢 **DISPONIBLE** - Prêt à recevoir des courses
- 🔵 **EN_COURSE** - Course en cours (automatique)
- ⚫ **HORS_LIGNE** - Indisponible

**Actions :**
- Toggle rapide DISPONIBLE ↔ HORS_LIGNE
- Passage automatique à EN_COURSE quand démarre
- Retour automatique à DISPONIBLE quand termine

---

### 🗺️ LOCALISATION & SUIVI DE TRAJET (Leaflet.js)

#### 3. **Carte interactive avec Leaflet.js**

**Installation :**
```bash
npm install leaflet react-leaflet
npm install -D @types/leaflet
```

**Fonctionnalités :**

##### A. **Localisation en temps réel du chauffeur**
- 📍 Position GPS actuelle du chauffeur
- 🔄 Mise à jour toutes les 10-30 secondes
- 📡 Utilisation de l'API Geolocation du navigateur
- 💾 Envoi de la position au backend

**Backend requis :**
- Table `driver_locations` (driverId, latitude, longitude, timestamp)
- Endpoint `POST /drivers/:id/location` pour mettre à jour
- Endpoint `GET /drivers/:id/location` pour récupérer

##### B. **Affichage du trajet sur la carte**
- 📌 Marqueur point de départ (pickup)
- 🎯 Marqueur point d'arrivée (dropoff)
- 🛣️ Itinéraire calculé entre les deux points
- 🚗 Position actuelle du chauffeur

**Services de routing :**
- **Option 1 :** OpenStreetMap Routing (OSRM) - Gratuit
- **Option 2 :** Mapbox Directions API - Payant mais meilleur
- **Option 3 :** Google Maps Directions - Payant

##### C. **Navigation GPS**
- 🧭 Directions étape par étape
- 📏 Distance restante
- ⏱️ Temps estimé d'arrivée (ETA)
- 🔊 Instructions vocales (optionnel)

##### D. **Suivi client (côté client)**
- 👀 Le client peut voir la position du chauffeur en temps réel
- 📍 Carte sur la page de suivi
- ⏰ ETA mis à jour en temps réel
- 🔔 Notification quand le chauffeur approche

---

### 🎯 ARCHITECTURE TECHNIQUE

#### **Frontend Chauffeur**
```
/driver
  /dashboard          → Vue d'ensemble
  /courses            → Liste des courses
  /course/:id         → Détails + Carte + Navigation
  /historique         → Historique complet
  /stats              → Statistiques détaillées
```

#### **Composants Leaflet**
```typescript
// Composant carte de base
<MapContainer center={[lat, lng]} zoom={13}>
  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
  <Marker position={[pickupLat, pickupLng]} icon={pickupIcon} />
  <Marker position={[dropoffLat, dropoffLng]} icon={dropoffIcon} />
  <Marker position={[driverLat, driverLng]} icon={carIcon} />
  <Polyline positions={routeCoordinates} color="blue" />
</MapContainer>
```

#### **Geolocation en temps réel**
```typescript
// Hook pour suivre la position
useEffect(() => {
  const watchId = navigator.geolocation.watchPosition(
    (position) => {
      const { latitude, longitude } = position.coords
      // Envoyer au backend
      updateDriverLocation(driverId, latitude, longitude)
    },
    (error) => console.error(error),
    { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
  )
  return () => navigator.geolocation.clearWatch(watchId)
}, [])
```

#### **Backend - Endpoints requis**
```typescript
// Mettre à jour la position du chauffeur
POST /api/v1/drivers/:id/location
Body: { latitude: number, longitude: number }

// Récupérer la position du chauffeur (pour le client)
GET /api/v1/reservations/:code/driver-location
Response: { latitude: number, longitude: number, timestamp: Date }

// Calculer l'itinéraire
GET /api/v1/routing/directions
Params: { fromLat, fromLng, toLat, toLng }
Response: { coordinates: [lat, lng][], distance: number, duration: number }
```

---

### 📱 INTERFACE MOBILE-FIRST

**Pourquoi ?**
- Les chauffeurs utilisent leur téléphone
- Besoin d'une interface tactile
- GPS mobile plus précis

**Design :**
- 📱 Boutons larges et faciles à toucher
- 🎨 Contraste élevé pour lisibilité en plein soleil
- 🔋 Optimisé pour économiser la batterie
- 📶 Fonctionne avec connexion faible

---

### 🔔 NOTIFICATIONS PUSH (Optionnel)

**Pour le chauffeur :**
- 🔔 Nouvelle course assignée
- ⏰ Rappel 15 min avant la course
- 📍 Client a annulé

**Pour le client :**
- 🚗 Chauffeur en route
- ⏱️ Chauffeur arrive dans 5 min
- ✅ Chauffeur est arrivé

**Technologies :**
- Firebase Cloud Messaging (FCM)
- Web Push API
- Service Workers

---

## 🛠️ IMPLÉMENTATION PROPOSÉE

### **Phase 1 - Dashboard de base (2-3h)**
1. ✅ Créer les pages chauffeur
2. ✅ Liste des courses assignées
3. ✅ Boutons démarrer/terminer
4. ✅ Statistiques du jour
5. ✅ Toggle de statut

### **Phase 2 - Localisation (3-4h)**
1. ✅ Installer Leaflet.js
2. ✅ Créer le composant carte
3. ✅ Geolocation du chauffeur
4. ✅ Backend pour sauvegarder la position
5. ✅ Afficher la position sur la carte

### **Phase 3 - Suivi de trajet (2-3h)**
1. ✅ Intégrer OSRM pour le routing
2. ✅ Afficher l'itinéraire sur la carte
3. ✅ Calculer distance et ETA
4. ✅ Mettre à jour en temps réel

### **Phase 4 - Suivi client (2h)**
1. ✅ Carte sur la page de suivi client
2. ✅ Position du chauffeur en temps réel
3. ✅ ETA affiché au client
4. ✅ Polling toutes les 10 secondes

---

## 🎯 EXEMPLE D'UTILISATION

### **Scénario complet :**

1. **Chauffeur se connecte**
   - Voit son dashboard
   - Active son statut → DISPONIBLE
   - Sa position GPS est envoyée au backend

2. **Admin assigne une course**
   - Chauffeur reçoit notification
   - Voit la nouvelle course dans "Courses assignées"
   - Clique pour voir les détails

3. **Chauffeur démarre la course**
   - Clique sur "Démarrer"
   - Statut → EN_COURSE
   - Carte s'affiche avec :
     - Point de départ (pickup)
     - Point d'arrivée (dropoff)
     - Itinéraire calculé
     - Sa position actuelle
   - Email envoyé au client

4. **Pendant le trajet**
   - Position GPS mise à jour toutes les 10s
   - Client voit la position en temps réel
   - ETA mis à jour automatiquement

5. **Chauffeur termine la course**
   - Clique sur "Terminer"
   - Statut → DISPONIBLE
   - Email + reçu PDF envoyé au client
   - Revenus du jour mis à jour

---

## 📊 DONNÉES REQUISES POUR LA LOCALISATION

### **Zones avec coordonnées GPS**
Actuellement, les zones n'ont pas de coordonnées. Il faut ajouter :

```typescript
// backend/src/common/entities/zone.entity.ts
@Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
latitude: number;

@Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
longitude: number;
```

**Exemples pour Dakar :**
- AIBD (Aéroport) : 14.7447, -17.0732
- Almadies : 14.7392, -17.5178
- Plateau : 14.6928, -17.4467
- Parcelles Assainies : 14.7644, -17.4431

---

## 🔒 SÉCURITÉ & CONFIDENTIALITÉ

**Localisation :**
- ✅ Position partagée uniquement pendant une course active
- ✅ Historique des positions supprimé après 24h
- ✅ Client ne voit que son chauffeur assigné
- ✅ Chauffeur peut désactiver la localisation (HORS_LIGNE)

**Données personnelles :**
- ✅ Conformité RGPD
- ✅ Consentement explicite pour la géolocalisation
- ✅ Données chiffrées en transit (HTTPS)

---

## 💰 COÛTS

### **Gratuit :**
- ✅ Leaflet.js - Open source
- ✅ OpenStreetMap - Gratuit
- ✅ OSRM (routing) - Gratuit
- ✅ Geolocation API - Natif navigateur

### **Payant (optionnel) :**
- Mapbox (meilleur routing) : ~0.50€/1000 requêtes
- Google Maps : ~5€/1000 requêtes
- Firebase (notifications) : Gratuit jusqu'à 10k/mois

**Recommandation :** Commencer avec la stack gratuite (Leaflet + OSM + OSRM)

---

## ❓ QUESTIONS POUR VOUS

1. **Voulez-vous que je commence par :**
   - Phase 1 (Dashboard chauffeur de base) ?
   - Phase 2 (Localisation) ?
   - Tout d'un coup ?a

2. **Pour la localisation :**
   - Avez-vous les coordonnées GPS des zones ?
   - Sinon, je peux les ajouter pour les principales zones de Dakar

3. **Notifications :**
   - Voulez-vous des notifications push ?
   - Ou juste des emails ?

**Je suis prêt à implémenter tout ça ! Dites-moi par où commencer.** 🚀
