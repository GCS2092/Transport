# 🔍 ANALYSE DES ERREURS - 5 MARS 2026, 00:04

## ❌ ERREUR 1 : Tarif non trouvé (404)

### Détails de l'erreur
```
GET /api/v1/tariffs/price?from=53309d22-30cb-4b9c-a455-d366fdd751b2&to=90ef05b1-3744-4160-a0b1-e5c2b4c61ac1 - 404
```

### Requête SQL exécutée
```sql
SELECT DISTINCT "distinctAlias"."Tariff_id" AS "ids_Tariff_id" 
FROM (
  SELECT "Tariff"."id" AS "Tariff_id", 
         "Tariff"."zoneFromId" AS "Tariff_zoneFromId", 
         "Tariff"."zoneToId" AS "Tariff_zoneToId", 
         "Tariff"."price" AS "Tariff_price", 
         "Tariff"."isActive" AS "Tariff_isActive" 
  FROM "tariffs" "Tariff" 
  WHERE (("Tariff"."zoneFromId" = $1) 
    AND ("Tariff"."zoneToId" = $2) 
    AND ("Tariff"."isActive" = $3))
) "distinctAlias" 
ORDER BY "Tariff_id" ASC 
LIMIT 1

PARAMETERS: [
  "53309d22-30cb-4b9c-a455-d366fdd751b2",  -- zoneFromId
  "90ef05b1-3744-4160-a0b1-e5c2b4c61ac1",  -- zoneToId
  true                                      -- isActive
]
```

### Diagnostic
✅ **La requête SQL est correcte**
❌ **Aucun tarif actif trouvé pour cette combinaison de zones**

### Causes possibles
1. **Tarif non créé** - L'admin n'a pas créé de tarif pour cette paire de zones
2. **Tarif désactivé** - Le tarif existe mais `isActive = false`
3. **Sens inversé** - Le tarif existe pour `to → from` mais pas pour `from → to`

### Solution
Le système doit gérer les tarifs **bidirectionnels** :
- Si tarif `A → B` n'existe pas, chercher `B → A`
- Ou créer automatiquement les deux sens lors de la création

---

## ❌ ERREUR 2 : Création réservation échouée (400)

### Détails de l'erreur
```
POST /api/v1/reservations - 400
```

### Causes possibles

#### 1. **Validation DTO échouée**
Le `CreateReservationDto` a des validations strictes :
- `clientPhone` : doit matcher `/^\+[1-9]\d{6,14}$/` (format international)
- `passengers` : entre 1 et 8
- `pickupZoneId` OU `pickupCustomAddress` requis
- `dropoffZoneId` OU `dropoffCustomAddress` requis

#### 2. **Problème de tarif**
Si le tarif n'existe pas (erreur 1), la création de réservation échoue car :
- Le service essaie de calculer le prix
- Ne trouve pas de tarif
- Retourne une erreur 400

#### 3. **Données manquantes**
- Email invalide
- Téléphone mal formaté
- Dates invalides
- Zones inexistantes

---

## 🔧 SOLUTIONS RECOMMANDÉES

### Solution 1 : Tarifs bidirectionnels

**Modifier `tariffs.service.ts` :**

```typescript
async findByZones(zoneFromId: string, zoneToId: string): Promise<Tariff | null> {
  // Chercher dans le sens normal
  let tariff = await this.tariffsRepository.findOne({
    where: { zoneFromId, zoneToId, isActive: true },
  });
  
  // Si pas trouvé, chercher dans le sens inverse
  if (!tariff) {
    tariff = await this.tariffsRepository.findOne({
      where: { zoneFromId: zoneToId, zoneToId: zoneFromId, isActive: true },
    });
  }
  
  return tariff;
}
```

### Solution 2 : Meilleure gestion des erreurs

**Modifier `reservations.service.ts` :**

```typescript
async create(dto: CreateReservationDto): Promise<Reservation> {
  // Validation des zones
  if (!dto.pickupZoneId && !dto.pickupCustomAddress) {
    throw new BadRequestException('Pickup zone or custom address required');
  }
  
  if (!dto.dropoffZoneId && !dto.dropoffCustomAddress) {
    throw new BadRequestException('Dropoff zone or custom address required');
  }
  
  // Calcul du prix
  let amount = 0;
  if (dto.pickupZoneId && dto.dropoffZoneId) {
    const tariff = await this.tariffsService.findByZones(
      dto.pickupZoneId, 
      dto.dropoffZoneId
    );
    
    if (!tariff) {
      throw new BadRequestException(
        `No tariff found between these zones. Please contact support.`
      );
    }
    
    amount = tariff.price;
  } else {
    // Prix par défaut pour adresses personnalisées
    amount = 10000; // 10 000 FCFA
  }
  
  // ... reste du code
}
```

### Solution 3 : Logs détaillés

**Ajouter des logs pour déboguer :**

```typescript
@Post()
@Throttle({ default: { limit: 10, ttl: 3600000 } })
async create(@Body() dto: CreateReservationDto) {
  try {
    this.logger.log(`Creating reservation: ${JSON.stringify(dto)}`);
    const result = await this.reservationsService.create(dto);
    this.logger.log(`Reservation created: ${result.code}`);
    return result;
  } catch (error) {
    this.logger.error(`Reservation creation failed: ${error.message}`);
    throw error;
  }
}
```

---

## 📊 VÉRIFICATIONS À FAIRE

### 1. Vérifier les tarifs en base
```sql
SELECT * FROM tariffs WHERE "isActive" = true;
```

### 2. Vérifier les zones
```sql
SELECT id, name FROM zones WHERE "isActive" = true;
```

### 3. Tester la création de tarif
- Créer un tarif pour chaque paire de zones
- Ou implémenter la recherche bidirectionnelle

### 4. Tester le format du téléphone
```
✅ Valide : +221771234567
❌ Invalide : 771234567
❌ Invalide : 00221771234567
```

---

## 🎯 PRIORITÉS

1. **URGENT** : Implémenter la recherche bidirectionnelle des tarifs
2. **URGENT** : Ajouter des logs détaillés pour déboguer
3. **IMPORTANT** : Créer tous les tarifs manquants
4. **IMPORTANT** : Améliorer les messages d'erreur

---

## 🧪 TESTS À EFFECTUER

### Test 1 : Tarif bidirectionnel
```bash
# Créer tarif A → B
curl -X POST http://localhost:3001/api/v1/tariffs \
  -H "Content-Type: application/json" \
  -d '{
    "zoneFromId": "zone-a-uuid",
    "zoneToId": "zone-b-uuid",
    "price": 15000
  }'

# Tester B → A (devrait fonctionner après correction)
curl "http://localhost:3001/api/v1/tariffs/price?from=zone-b-uuid&to=zone-a-uuid"
```

### Test 2 : Création réservation
```bash
curl -X POST http://localhost:3001/api/v1/reservations \
  -H "Content-Type: application/json" \
  -d '{
    "clientFirstName": "Fatou",
    "clientLastName": "Sall",
    "clientEmail": "fatou@test.com",
    "clientPhone": "+221771234567",
    "tripType": "ALLER_SIMPLE",
    "pickupZoneId": "zone-a-uuid",
    "dropoffZoneId": "zone-b-uuid",
    "pickupDateTime": "2026-03-06T10:00:00Z",
    "passengers": 2,
    "language": "fr"
  }'
```

---

**CONCLUSION :** Les deux erreurs sont liées. Le tarif manquant (404) empêche la création de la réservation (400). La solution prioritaire est d'implémenter la recherche bidirectionnelle des tarifs.
