# 🔧 Instructions de débogage - Erreur 401

## Étape 1 : Vérifier le token dans le navigateur

1. Ouvrez la **Console** du navigateur (F12)
2. Tapez cette commande :
```javascript
localStorage.getItem('token')
```
3. Vous devriez voir un long token JWT

**Si le token est `null` :**
- Vous devez vous reconnecter
- Allez sur `/login` et connectez-vous avec vos identifiants admin

## Étape 2 : Hard Refresh

Après avoir vérifié que le token existe :

- **Windows/Linux :** `Ctrl + Shift + R` ou `Ctrl + F5`
- **Mac :** `Cmd + Shift + R`

## Étape 3 : Vérifier que l'intercepteur fonctionne

1. Ouvrez l'onglet **Network** dans les DevTools (F12)
2. Rechargez la page des stats chauffeur
3. Cliquez sur la requête `stats` qui échoue
4. Dans l'onglet **Headers**, vérifiez la section **Request Headers**
5. Vous devriez voir : `Authorization: Bearer eyJhbGc...`

**Si le header Authorization est absent :**
- Le frontend n'a pas été rechargé correctement
- Fermez complètement le navigateur et rouvrez-le

## Étape 4 : Redémarrer le serveur frontend (si nécessaire)

Si rien ne fonctionne :

```bash
# Dans le terminal frontend
# Ctrl+C pour arrêter
npm run dev
```

Puis rechargez la page.

## ✅ Vérification finale

Une fois que tout fonctionne, vous devriez voir :
- ✅ Pas d'erreur 401
- ✅ Les stats du chauffeur s'affichent
- ✅ Les revenus ne sont plus à 0
