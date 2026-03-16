Tu es bien connecté à TablePlus ✅ Je vois toutes tes tables !

---

## Supprimer les données d'une table

Clic droit sur la table → **"Truncate..."** → confirme

⚠️ Ça supprime toutes les lignes mais garde la structure de la table.

---

## Si la table est connectée à une autre (clés étrangères)

C'est là que ça se complique. Par exemple :
- `reservations` est liée à `users` et `drivers`
- `email_logs` est liée à `reservations`
- `ratings` est liée à `reservations`

Si tu truncates `reservations` sans truncater d'abord les tables liées → **erreur de contrainte**.

---

## Ordre correct pour vider sans erreur

Truncate dans cet ordre :

```
1. ratings
2. email_logs
3. audit_logs
4. driver_proposals
5. driver_locations
6. reservations_arc... (archive)
7. reservations
8. refresh_tokens
9. contacts
```

**Ne touche pas :**
- ✅ `users`
- ✅ `drivers`
- ✅ `zones`
- ✅ `tariffs`
- ✅ `settings`
- ✅ `faqs`
- ✅ `promo_codes`

---

Tu veux vider toutes ces tables ou juste certaines ? 👇