# Rapports mensuels PDF (chauffeurs + administrateurs)

## Comportement

- **Quand** : le **1er de chaque mois à 08:00** (heure du serveur / conteneur).
- **Période couverte** : le **mois civil précédent** (ex. le 1er février → rapport de janvier).
- **Données** : uniquement les réservations **`TERMINEE`** dont la date retenue est  
  `COALESCE(completedAt, pickupDateTime)` dans l’intervalle du mois.

## Contenu PDF chauffeur

- Identité : nom, prénom, type de véhicule, immatriculation.
- Nombre de courses terminées sur la période.
- Répartition paiements : complet, impayé, acompte, en attente, remboursé.
- Totaux : encaissé (paiement complet), montant impayé, acomptes.
- **Créneaux horaires** les plus actifs (heure de départ de la course).
- **Zones de départ** les plus fréquentes (libellé zone ou adresse personnalisée tronquée).
- Liste détaillée des **courses impayées** (code, montant, client, téléphone, trajet).

## Contenu PDF administrateur

- Message d’introduction du type : *« C’est l’heure du récapitulatif mensuel »*.
- Synthèse globale (volume, CA des paiements complets, total impayé).
- Synthèse **par chauffeur** (nombre de courses, encaissé, impayé).
- **Liste complète des courses impayées** avec **coordonnées client** (nom, téléphone, email) et chauffeur, pour suivi depuis le dashboard.

## Envoi

- **Chaque chauffeur actif** ayant une **adresse email** reçoit un PDF en pièce jointe.
- **Tous les comptes admin actifs** (`role = ADMIN`, `isActive = true`) reçoivent le PDF global.

## Variables d’environnement

| Variable | Défaut | Rôle |
|----------|--------|------|
| `MONTHLY_REPORT_ENABLED` | `true` | Mettre à `false` pour désactiver le job sans retirer le code. |

## Base de données

Si `notification_type` est un ENUM PostgreSQL, ajouter les valeurs :

```sql
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'MONTHLY_DRIVER_REPORT';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'MONTHLY_ADMIN_REPORT';
```

En développement avec `synchronize: true`, TypeORM peut créer/mettre à jour selon ta config.

## Test manuel

Tu peux appeler depuis le code ou ajouter temporairement un endpoint admin qui exécute  
`MonthlyReportService.generateAndSendMonthlyReports()` (à retirer après test).
