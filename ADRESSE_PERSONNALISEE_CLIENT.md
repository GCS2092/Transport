# 📍 ADRESSE PERSONNALISÉE POUR LES CLIENTS

## 🎯 OBJECTIF

Permettre aux clients d'entrer une adresse personnalisée si elle n'est pas dans la liste des zones prédéfinies.

---

## 💡 SOLUTION PROPOSÉE

### **Option 1 : Adresse texte libre (Simple)**

**Avantages :**
- ✅ Rapide à implémenter
- ✅ Pas besoin de coordonnées GPS
- ✅ Flexible pour le client

**Inconvénients :**
- ❌ Pas de validation d'adresse
- ❌ Pas de calcul automatique du prix
- ❌ Pas de navigation GPS automatique

**Implémentation :**
```typescript
// Ajouter un toggle dans le formulaire
<select>
  <option>Zone prédéfinie</option>
  <option value="custom">Autre adresse...</option>
</select>

// Si "custom" sélectionné, afficher un champ texte
{isCustomAddress && (
  <input 
    type="text" 
    placeholder="Entrez votre adresse complète"
    value={customAddress}
  />
)}
```

---

### **Option 2 : Autocomplete avec Leaflet + Nominatim (Recommandé)**

**Avantages :**
- ✅ Validation automatique des adresses
- ✅ Coordonnées GPS récupérées
- ✅ Suggestions pendant la saisie
- ✅ Calcul de distance possible
- ✅ Gratuit (OpenStreetMap)

**Inconvénients :**
- ⚠️ Nécessite une connexion internet
- ⚠️ Peut être moins précis dans certaines zones

**Implémentation :**

#### A. **Installation**
```bash
npm install leaflet-geosearch
```

#### B. **Composant autocomplete**
```typescript
import { OpenStreetMapProvider } from 'leaflet-geosearch';

const provider = new OpenStreetMapProvider();

const handleSearch = async (query: string) => {
  const results = await provider.search({ query });
  // results contient: label, x (lng), y (lat)
  setSuggestions(results);
};
```

#### C. **Interface utilisateur**
```typescript
<div>
  <label>Adresse de départ</label>
  
  {/* Option 1: Zone prédéfinie */}
  <select value={pickupType} onChange={e => setPickupType(e.target.value)}>
    <option value="zone">Zone prédéfinie</option>
    <option value="custom">Adresse personnalisée</option>
  </select>

  {pickupType === 'zone' ? (
    <select value={pickupZoneId}>
      <option>AIBD</option>
      <option>Almadies</option>
      {/* ... */}
    </select>
  ) : (
    <div>
      <input
        type="text"
        value={customPickupAddress}
        onChange={e => handleAddressSearch(e.target.value)}
        placeholder="Entrez une adresse (ex: Rue 10, Sicap Liberté)"
      />
      {suggestions.length > 0 && (
        <ul className="suggestions">
          {suggestions.map(s => (
            <li onClick={() => selectAddress(s)}>
              {s.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  )}
</div>
```

---

### **Option 3 : Carte interactive (Avancé)**

**Avantages :**
- ✅ Très visuel
- ✅ Précision maximale
- ✅ Client peut pointer exactement où il veut

**Inconvénients :**
- ⚠️ Plus complexe à utiliser sur mobile
- ⚠️ Nécessite plus de développement

**Implémentation :**
```typescript
<MapContainer>
  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
  <Marker 
    position={pickupPosition} 
    draggable={true}
    eventHandlers={{
      dragend: (e) => {
        const { lat, lng } = e.target.getLatLng();
        setPickupPosition([lat, lng]);
      }
    }}
  />
</MapContainer>
```

---

## 🏗️ ARCHITECTURE BACKEND

### **Modifications nécessaires**

#### 1. **Entité Reservation**
```typescript
// backend/src/modules/reservations/entities/reservation.entity.ts

// Garder les zones existantes (optionnel)
@Column({ nullable: true })
pickupZoneId: string;

@Column({ nullable: true })
dropoffZoneId: string;

// Ajouter les adresses personnalisées
@Column({ nullable: true, type: 'text' })
pickupCustomAddress: string;

@Column({ nullable: true, type: 'decimal', precision: 10, scale: 7 })
pickupLatitude: number;

@Column({ nullable: true, type: 'decimal', precision: 10, scale: 7 })
pickupLongitude: number;

@Column({ nullable: true, type: 'text' })
dropoffCustomAddress: string;

@Column({ nullable: true, type: 'decimal', precision: 10, scale: 7 })
dropoffLatitude: number;

@Column({ nullable: true, type: 'decimal', precision: 10, scale: 7 })
dropoffLongitude: number;
```

#### 2. **DTO de création**
```typescript
// backend/src/modules/reservations/dto/create-reservation.dto.ts

@IsOptional()
@IsUUID()
pickupZoneId?: string;

@IsOptional()
@IsString()
pickupCustomAddress?: string;

@IsOptional()
@IsNumber()
pickupLatitude?: number;

@IsOptional()
@IsNumber()
pickupLongitude?: number;

// Idem pour dropoff...
```

#### 3. **Calcul du prix**

**Option A : Prix fixe pour adresses personnalisées**
```typescript
if (pickupCustomAddress || dropoffCustomAddress) {
  // Prix de base + distance calculée
  const distance = calculateDistance(
    pickupLat, pickupLng, 
    dropoffLat, dropoffLng
  );
  amount = BASE_PRICE + (distance * PRICE_PER_KM);
}
```

**Option B : Trouver la zone la plus proche**
```typescript
const nearestPickupZone = findNearestZone(pickupLat, pickupLng);
const nearestDropoffZone = findNearestZone(dropoffLat, dropoffLng);
const tariff = await getTariff(nearestPickupZone, nearestDropoffZone);
amount = tariff.price;
```

#### 4. **Service de calcul de distance**
```typescript
// backend/src/common/utils/distance.ts

export function calculateDistance(
  lat1: number, 
  lng1: number, 
  lat2: number, 
  lng2: number
): number {
  // Formule de Haversine
  const R = 6371; // Rayon de la Terre en km
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance en km
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}
```

---

## 📱 INTERFACE UTILISATEUR

### **Design proposé**

```
┌─────────────────────────────────────┐
│ Point de départ                     │
├─────────────────────────────────────┤
│ ○ Zone prédéfinie                   │
│   [Sélectionner une zone ▼]         │
│                                     │
│ ○ Adresse personnalisée             │
│   [Entrez votre adresse...]         │
│   📍 Suggestions:                   │
│   • Rue 10, Sicap Liberté          │
│   • Rue 12, Sicap Liberté          │
└─────────────────────────────────────┘
```

### **Validation**

```typescript
// Au moins une des deux doit être remplie
if (!pickupZoneId && !pickupCustomAddress) {
  throw new Error('Veuillez sélectionner une zone ou entrer une adresse');
}

// Si adresse personnalisée, coordonnées requises
if (pickupCustomAddress && (!pickupLatitude || !pickupLongitude)) {
  throw new Error('Impossible de localiser cette adresse');
}
```

---

## 🗺️ QUARTIERS DE DAKAR

Voici les principaux quartiers à ajouter comme zones prédéfinies :

### **Dakar Centre**
- Plateau
- Médina
- Gueule Tapée
- Fass
- Colobane

### **Dakar Ouest**
- Almadies
- Ngor
- Ouakam
- Yoff
- Mermoz

### **Dakar Nord**
- Parcelles Assainies
- Grand Yoff
- HLM
- Sicap Liberté
- Sacré-Cœur

### **Dakar Sud**
- Point E
- Fann
- Amitié
- Dieuppeul

### **Pikine**
- Pikine Ancien
- Pikine Extension
- Thiaroye
- Guinaw Rails

### **Guédiawaye**
- Golf Sud
- Sam Notaire
- Médina Gounass

### **Rufisque**
- Rufisque Centre
- Bargny
- Diamniadio

### **Autres**
- AIBD (Aéroport)
- Gare routière Pompiers
- Port de Dakar

---

## 🎯 RECOMMANDATION FINALE

**Je recommande une approche hybride :**

### **Phase 1 : Zones prédéfinies étendues**
1. ✅ Ajouter tous les quartiers principaux de Dakar
2. ✅ Avec coordonnées GPS pour chaque zone
3. ✅ Tarifs prédéfinis entre zones populaires

### **Phase 2 : Adresse personnalisée avec autocomplete**
1. ✅ Option "Autre adresse" dans le formulaire
2. ✅ Autocomplete avec Nominatim (OpenStreetMap)
3. ✅ Calcul automatique du prix basé sur la distance
4. ✅ Validation des coordonnées GPS

### **Phase 3 : Carte interactive (optionnel)**
1. ✅ Afficher une carte pour confirmer l'adresse
2. ✅ Marqueur déplaçable pour ajuster la position
3. ✅ Aperçu du trajet

---

## 🚀 IMPLÉMENTATION

**Voulez-vous que je :**

1. **Ajoute d'abord les quartiers de Dakar** comme zones prédéfinies ?
2. **Implémente l'autocomplete d'adresse** avec Nominatim ?
3. **Les deux** en même temps ?

**Je suis prêt à implémenter la solution complète !** 🎉
