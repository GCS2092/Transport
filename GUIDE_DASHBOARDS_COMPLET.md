# 📚 GUIDE COMPLET DES DASHBOARDS - VTC DAKAR

## 🎯 VUE D'ENSEMBLE

L'application VTC Dakar dispose de **3 rôles principaux** avec des dashboards dédiés :
1. **CLIENT** - Réservation et suivi de courses
2. **CHAUFFEUR** - Navigation et gestion des courses
3. **ADMIN** - Gestion globale et statistiques

---

# 👤 DASHBOARD CLIENT

## 🏠 Page d'accueil (`/`)

### Fonctionnalités
- ✅ Formulaire de réservation complet
- ✅ Historique des courses actives
- ✅ Choix de langue (FR/EN)
- ✅ Géolocalisation automatique des adresses

### Scénario 1 : Réserver une course simple
**Étapes :**
1. Client arrive sur la page d'accueil
2. Remplit ses informations (nom, email, téléphone)
3. Choisit le type de trajet : "Aller simple"
4. **Option A** : Sélectionne zone de départ (ex: AIBD Aéroport)
5. **Option B** : Toggle "Adresse personnalisée" et tape "Rue 10, Sicap Liberté"
   - Le système géocode automatiquement l'adresse
   - Affiche "✓ Adresse localisée" en vert
6. Sélectionne zone d'arrivée (ex: Plateau)
7. Choisit date/heure de pickup
8. Entre le nombre de passagers
9. (Optionnel) Entre un code promo
   - Le système valide en temps réel
   - Affiche la réduction appliquée
10. Voit le prix estimé
11. Clique sur "Réserver"
12. Reçoit un code de réservation (ex: VTC-ABC123)
13. Reçoit un email de confirmation

**Résultat :**
- Réservation créée avec statut EN_ATTENTE
- Code sauvegardé dans localStorage
- Apparaît dans l'historique en haut de page

---

### Scénario 2 : Utiliser l'historique
**Étapes :**
1. Client revient sur le site
2. Voit ses courses actives en haut (EN_ATTENTE, ASSIGNEE, EN_COURS)
3. Clique sur un code (ex: VTC-ABC123)
4. Est redirigé vers la page de suivi

**Comportement automatique :**
- Les courses TERMINEE disparaissent automatiquement
- Les courses ANNULEE disparaissent automatiquement
- Maximum 10 courses dans l'historique

---

## 📍 Page de suivi (`/suivi`)

### Fonctionnalités
- ✅ Recherche par code de réservation
- ✅ Progression visuelle du statut
- ✅ Informations chauffeur (si assigné)
- ✅ **Carte en temps réel** (si EN_COURS)
- ✅ **Itinéraire + ETA** (si EN_COURS)
- ✅ **Téléchargement reçu PDF** (si TERMINEE)
- ✅ Annulation avec token

### Scénario 3 : Suivre sa course en temps réel
**Étapes :**
1. Client entre son code VTC-ABC123
2. Voit la progression : EN_ATTENTE → ASSIGNEE → EN_COURS
3. Voit les infos du chauffeur :
   - Nom : Moussa Diallo
   - Véhicule : Toyota Land Cruiser
   - Plaque : DK-1234-AA
   - Bouton "Appeler"
4. **Si course EN_COURS :**
   - Carte interactive s'affiche
   - Position du chauffeur (marqueur bleu) mise à jour toutes les 10s
   - Point de départ (marqueur vert)
   - **Itinéraire tracé** (ligne bleue)
   - **ETA affiché** : "Arrivée estimée : 8 min"
   - **Distance** : "2.3 km"
5. Voit le chauffeur approcher en temps réel
6. Reçoit un email quand la course démarre
7. Reçoit un email quand la course se termine

**Résultat :**
- Client sait exactement où est le chauffeur
- Client sait quand il arrivera
- Transparence totale

---

### Scénario 4 : Télécharger le reçu
**Étapes :**
1. Course terminée (statut TERMINEE)
2. Carte verte "✓ Course terminée" s'affiche
3. Bouton "📄 Télécharger le reçu PDF"
4. Clic → téléchargement automatique
5. Fichier : `recu-VTC-ABC123.pdf`

**Contenu du reçu :**
- Code de réservation
- Date et heure
- Trajet (départ → arrivée)
- Chauffeur
- Montant
- Détails du paiement

---

### Scénario 5 : Annuler une course
**Étapes :**
1. Client sur page de suivi
2. Course en statut EN_ATTENTE ou ASSIGNEE
3. Clique sur "Annuler la réservation"
4. Modale s'ouvre demandant le token d'annulation
5. Entre le token reçu par email
6. Confirme l'annulation
7. Statut passe à ANNULEE
8. Chauffeur (si assigné) redevient DISPONIBLE
9. Email de confirmation d'annulation envoyé

---

# 🚗 DASHBOARD CHAUFFEUR

## 📊 Dashboard principal (`/driver/dashboard`)

### Fonctionnalités
- ✅ Toggle statut (DISPONIBLE ↔ HORS_LIGNE)
- ✅ Géolocalisation en temps réel
- ✅ **Navigation complète** avec itinéraire
- ✅ **ETA en temps réel**
- ✅ Stats du jour (revenus, courses)
- ✅ Liste des courses assignées
- ✅ Historique du jour

### Scénario 6 : Démarrer sa journée
**Étapes :**
1. Chauffeur se connecte (`/login`)
2. Arrive sur le dashboard
3. Voit son statut : HORS_LIGNE
4. Clique sur le toggle → passe à DISPONIBLE
5. Bandeau apparaît : "Activez la géolocalisation"
6. Clique sur "Activer la localisation"
7. Navigateur demande la permission
8. Accepte → position GPS envoyée toutes les 30s
9. Indicateur vert : "✓ Géolocalisation active"

**Résultat :**
- Chauffeur visible sur la carte admin
- Peut recevoir des courses
- Position mise à jour en continu

---

### Scénario 7 : Recevoir et effectuer une course
**Étapes :**
1. Admin assigne une course (manuelle ou auto)
2. Chauffeur reçoit un email : "Nouvelle course assignée"
3. Course apparaît dans "📋 Courses assignées"
4. Voit :
   - Code : VTC-ABC123
   - Client : Fatou Sall
   - Téléphone : +221 77 123 45 67
   - Trajet : AIBD → Plateau
   - Montant : 15 000 FCFA
   - Date/heure : 5 mars à 18:00
5. Clique sur "Démarrer la course"
6. Statut passe à EN_COURS
7. **Section "🚗 Navigation en cours" s'affiche :**
   - Fond bleu dégradé
   - Infos client avec bouton "📞 Appeler"
   - **ETA en grand** : "8 min" (vert)
   - **Distance** : "3.2 km" (blanc)
   - **Destination** : AIBD (Aéroport)
   - **Carte grande** (h-96) avec :
     - Position chauffeur (marqueur bleu)
     - Destination (marqueur vert)
     - **Itinéraire tracé** (ligne bleue)
8. Suit l'itinéraire
9. **ETA se met à jour automatiquement** toutes les 30s
10. Arrive à destination
11. Clique sur "✓ Terminer la course"
12. Statut passe à TERMINEE
13. Chauffeur redevient DISPONIBLE
14. Client reçoit email + reçu PDF

**Résultat :**
- Course terminée
- Revenus du jour mis à jour
- Prêt pour la prochaine course

---

### Scénario 8 : Consulter ses stats
**Étapes :**
1. Chauffeur sur le dashboard
2. Voit en haut :
   - **Revenus du jour** : 45 000 FCFA
   - **Courses du jour** : 3
3. Scroll vers le bas
4. Voit "📜 Historique du jour"
5. Liste des courses terminées :
   - VTC-ABC123 : AIBD → Plateau (15 000 FCFA)
   - VTC-DEF456 : Plateau → Almadies (20 000 FCFA)
   - VTC-GHI789 : Almadies → AIBD (10 000 FCFA)

---

# 👨‍💼 DASHBOARD ADMIN

## 📊 Dashboard principal (`/admin`)

### Fonctionnalités
- ✅ KPIs (revenus, réservations, chauffeurs)
- ✅ Graphiques (revenus 7j, répartition statuts)
- ✅ Liste chauffeurs actifs avec courses
- ✅ Alertes (emails échoués)
- ✅ **Bouton vers carte globale**

### Scénario 9 : Vue d'ensemble quotidienne
**Étapes :**
1. Admin se connecte
2. Voit les KPIs :
   - **Revenus totaux** : 2 450 000 FCFA
   - **Revenus du mois** : 450 000 FCFA
   - **Réservations totales** : 156
   - **Chauffeurs actifs** : 8
3. Voit les graphiques :
   - **Revenus 7 derniers jours** (bar chart)
   - **Réservations par statut** (pie chart)
   - **Chauffeurs par statut** (pie chart)
4. Voit "Chauffeurs actifs" :
   - Moussa Diallo (EN_COURSE)
     - Course : VTC-ABC123
     - Client : Fatou Sall
     - Trajet : AIBD → Plateau
     - Montant : 15 000 FCFA
   - Amadou Ba (DISPONIBLE)
5. Clique sur "🗺️ Carte des chauffeurs"

---

## 🗺️ Carte globale (`/admin/map`)

### Fonctionnalités
- ✅ Carte interactive avec tous les chauffeurs
- ✅ **Filtres par statut** (Tous/Dispo/En course)
- ✅ Sidebar avec liste des chauffeurs
- ✅ Sélection chauffeur pour détails
- ✅ Rafraîchissement auto toutes les 10s

### Scénario 10 : Surveiller les chauffeurs en temps réel
**Étapes :**
1. Admin sur la carte globale
2. Voit la carte de Dakar
3. Voit les marqueurs :
   - 🔵 Chauffeurs disponibles
   - 🔴 Chauffeurs en course
4. **Utilise les filtres :**
   - Clique sur "Disponibles (5)" → voit uniquement les dispos
   - Clique sur "En course (3)" → voit uniquement ceux en course
   - Clique sur "Tous (8)" → voit tout le monde
5. Dans la sidebar, voit la liste :
   - Moussa Diallo (🔴 En course)
     - Position : 14.7167, -17.4677
     - Mise à jour : 23:15
     - Course : VTC-ABC123
     - Client : Fatou Sall
     - Trajet : AIBD → Plateau
6. Clique sur un chauffeur
7. Panel détails s'ouvre à droite :
   - Nom, véhicule, plaque
   - Statut
   - Téléphone (cliquable)
   - Position GPS
   - Course en cours (si applicable)

**Résultat :**
- Vue d'ensemble en temps réel
- Peut contacter n'importe quel chauffeur
- Voit qui est disponible

---

## 📋 Gestion des réservations (`/admin/reservations`)

### Fonctionnalités
- ✅ Liste paginée avec filtres
- ✅ **Recherche par code**
- ✅ **Recherche par client**
- ✅ Filtres par statut
- ✅ **Assignation automatique**
- ✅ Assignation manuelle
- ✅ Changement de statut
- ✅ Annulation
- ✅ Export CSV

### Scénario 11 : Assigner automatiquement un chauffeur
**Étapes :**
1. Admin sur `/admin/reservations`
2. Voit liste des réservations
3. Filtre "EN_ATTENTE" → 5 réservations
4. Clique sur "Assigner" pour VTC-ABC123
5. Modale s'ouvre
6. Voit :
   - **Bouton bleu** : "🤖 Assignation automatique (chauffeur le plus proche)"
   - Séparateur "OU"
   - Liste des chauffeurs disponibles
7. Clique sur "Assignation automatique"
8. Système :
   - Récupère tous les chauffeurs DISPONIBLE
   - Récupère leurs positions GPS
   - Calcule la distance avec formule de Haversine
   - Trouve le plus proche : Amadou Ba (2.3 km)
   - Assigne automatiquement
9. Alert : "Chauffeur assigné automatiquement avec succès !"
10. Statut passe à ASSIGNEE
11. Chauffeur reçoit email
12. Chauffeur passe à EN_COURSE

**Résultat :**
- Assignation optimale en 1 clic
- Temps de réponse minimal
- Client satisfait

---

### Scénario 12 : Rechercher une réservation
**Étapes :**
1. Admin sur `/admin/reservations`
2. **Option A - Recherche par code :**
   - Clique sur "🔍 Par code"
   - Tape "VTC-ABC123"
   - Résultat instantané
3. **Option B - Recherche par client :**
   - Clique sur "👤 Par client"
   - Tape "Fatou Sall" ou "fatou@email.com" ou "77 123 45 67"
   - Voit toutes les réservations de ce client
4. Compteur : "3 résultat(s) trouvé(s)"

---

## 👥 Gestion des chauffeurs (`/admin/drivers`)

### Scénario 13 : Voir les stats d'un chauffeur
**Étapes :**
1. Admin sur `/admin/drivers`
2. Clique sur "Voir stats" pour Moussa Diallo
3. Voit :
   - **Total courses** : 156
   - **Courses complétées** : 145
   - **Courses annulées** : 11
   - **Taux de complétion** : 93%
   - **Revenus totaux** : 2 340 000 FCFA
   - **Revenus du mois** : 450 000 FCFA
   - **Valeur moyenne** : 15 000 FCFA
   - **Graphiques** de performance
   - **Liste des 10 dernières courses**

---

# 🎯 SCÉNARIOS COMPLETS END-TO-END

## Scénario 14 : Course complète de A à Z

### 1. CLIENT - Réservation (09:00)
- Fatou va sur vtcdakar.com
- Réserve AIBD → Plateau pour 18:00
- Adresse personnalisée : "Rue 10, Sicap Liberté"
- Système géocode automatiquement
- Prix : 15 000 FCFA
- Code promo : BIENVENUE20 (-20%)
- Prix final : 12 000 FCFA
- Reçoit code : VTC-ABC123
- Email de confirmation

### 2. ADMIN - Assignation (17:30)
- Admin voit la réservation EN_ATTENTE
- Clique sur "Assignation automatique"
- Système trouve Moussa Diallo (le plus proche, 2.3 km)
- Assigne automatiquement
- Statut → ASSIGNEE

### 3. CHAUFFEUR - Notification (17:30)
- Moussa reçoit email "Nouvelle course"
- Voit la course dans son dashboard
- Client : Fatou Sall
- Pickup : Rue 10, Sicap Liberté (17:53)
- Dropoff : Plateau
- Se prépare

### 4. CHAUFFEUR - Démarrage (17:50)
- Moussa clique "Démarrer la course"
- Statut → EN_COURS
- Navigation s'affiche :
  - Itinéraire vers Rue 10, Sicap
  - ETA : 8 min
  - Distance : 3.2 km
- Position envoyée toutes les 30s

### 5. CLIENT - Suivi temps réel (17:50)
- Fatou reçoit email "Votre chauffeur est en route"
- Va sur page de suivi
- Voit la carte :
  - Position de Moussa (marqueur bleu)
  - Son adresse (marqueur vert)
  - Itinéraire tracé
  - **ETA : 8 min**
  - **Distance : 3.2 km**
- Voit Moussa approcher en temps réel

### 6. ADMIN - Surveillance (17:55)
- Admin sur carte globale
- Voit Moussa en route (🔴 En course)
- Voit l'itinéraire sur la carte
- Voit ETA : 3 min

### 7. CHAUFFEUR - Arrivée (17:58)
- Moussa arrive
- Prend Fatou
- Démarre vers Plateau
- ETA se recalcule : 12 min

### 8. CHAUFFEUR - Fin de course (18:10)
- Moussa arrive au Plateau
- Clique "✓ Terminer la course"
- Statut → TERMINEE
- Redevient DISPONIBLE

### 9. CLIENT - Reçu (18:10)
- Fatou reçoit email "Course terminée"
- Va sur page de suivi
- Carte verte "✓ Course terminée"
- Clique "📄 Télécharger le reçu PDF"
- Reçoit `recu-VTC-ABC123.pdf`

### 10. ADMIN - Stats (18:15)
- Dashboard mis à jour :
  - Revenus du jour : +12 000 FCFA
  - Courses du jour : +1
- Moussa :
  - Revenus du jour : +12 000 FCFA
  - Courses du jour : +1

---

# 📱 FONCTIONNALITÉS TRANSVERSALES

## 🔔 Emails automatiques

### Client reçoit :
1. Confirmation de réservation
2. Chauffeur assigné
3. Course démarrée
4. Course terminée (+ PDF)
5. Annulation confirmée

### Chauffeur reçoit :
1. Nouvelle course assignée
2. Course annulée
3. Rappel J-1 (si réservation future)

## 🗺️ Géolocalisation

### Chauffeur :
- Permission demandée explicitement
- Position envoyée toutes les 30s
- Stockée dans `driver_locations`
- Utilisée pour assignation auto

### Client :
- Peut entrer adresse personnalisée
- Géocodage automatique (Nominatim)
- Coordonnées GPS stockées
- Utilisées pour itinéraire

## 📊 Services gratuits

- **Nominatim** : Géocodage (1 req/sec)
- **OSRM** : Calcul d'itinéraire (illimité)
- **Leaflet** : Cartes interactives
- **OpenStreetMap** : Tuiles de carte

---

# 🎓 BONNES PRATIQUES

## Pour le CLIENT
1. Toujours vérifier l'email de confirmation
2. Garder le code de réservation
3. Activer les notifications email
4. Télécharger le reçu après chaque course

## Pour le CHAUFFEUR
1. Toujours activer la géolocalisation
2. Passer à DISPONIBLE en début de journée
3. Vérifier les courses assignées régulièrement
4. Appeler le client si besoin

## Pour l'ADMIN
1. Utiliser l'assignation automatique quand possible
2. Surveiller la carte globale
3. Vérifier les alertes (emails échoués)
4. Exporter les stats régulièrement

---

# 🔧 DÉPANNAGE

## Client ne voit pas son chauffeur
- Vérifier que la course est EN_COURS
- Vérifier que le chauffeur a activé la géolocalisation
- Rafraîchir la page

## Chauffeur ne reçoit pas de courses
- Vérifier le statut : doit être DISPONIBLE
- Vérifier la géolocalisation : doit être active
- Contacter l'admin

## Admin ne voit pas les chauffeurs sur la carte
- Vérifier que les chauffeurs ont activé la géolocalisation
- Vérifier les filtres (Tous/Dispo/En course)
- Rafraîchir la page

---

**Date de création :** 4 mars 2026, 23:30 UTC  
**Version :** 1.0  
**Auteur :** Système VTC Dakar
