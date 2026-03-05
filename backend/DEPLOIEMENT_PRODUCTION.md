# Guide Déploiement Production

## 📋 Checklist avant déploiement

### 1. Frontend (Vercel)
- [x] Code poussé sur GitHub
- [ ] Variables d'environnement configurées sur Vercel
- [ ] Domaine custom configuré (optionnel)

### 2. Backend (à héberger)
- [ ] Base de données PostgreSQL créée
- [ ] Variables d'environnement `.env` configurées
- [ ] Backend déployé et accessible via HTTPS
- [ ] CORS configuré pour autoriser le frontend

---

## 🌐 Configuration CORS (Backend)

### Fichier `.env` du backend

Ajoute cette variable dans ton fichier `.env` :

```env
# CORS : Origines autorisées (séparées par des virgules)
ALLOWED_ORIGINS=https://transport-six-xi.vercel.app,https://ton-domaine-custom.com
```

**Important :**
- Sépare les URLs par des **virgules** (pas d'espaces)
- Utilise **HTTPS** pour la production
- Pas de `/` à la fin des URLs

### Exemples selon ton setup

#### Vercel uniquement (actuel)
```env
ALLOWED_ORIGINS=https://transport-six-xi.vercel.app
```

#### Vercel + domaine custom
```env
ALLOWED_ORIGINS=https://transport-six-xi.vercel.app,https://vtcdakar.com,https://www.vtcdakar.com
```

#### Plusieurs domaines Vercel (preview + production)
```env
ALLOWED_ORIGINS=https://transport-six-xi.vercel.app,https://transport-git-main-gcs2092s-projects.vercel.app
```

---

## 🗄️ Base de données PostgreSQL

### Options d'hébergement recommandées

#### 1. **Neon** (gratuit, recommandé pour démarrer)
- 🆓 Plan gratuit : 0.5 GB stockage
- ⚡ Serverless, auto-scaling
- 🔗 URL : https://neon.tech

**Étapes :**
1. Créer un compte sur Neon
2. Créer un nouveau projet
3. Copier la connection string fournie
4. Ajouter dans `.env` du backend :
   ```env
   DATABASE_URL=postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```

#### 2. **Supabase** (gratuit, 500 MB)
- 🆓 Plan gratuit : 500 MB stockage + 2 GB transfert
- 🔐 Authentification intégrée (optionnel)
- 🔗 URL : https://supabase.com

**Étapes :**
1. Créer un projet Supabase
2. Aller dans Settings → Database
3. Copier la connection string (mode "Session")
4. Ajouter dans `.env` :
   ```env
   DATABASE_URL=postgresql://postgres.xxx:password@aws-0-eu-central-1.pooler.supabase.com:5432/postgres
   ```

#### 3. **Railway** (payant après essai gratuit)
- 💰 $5/mois après 500h gratuites
- 🚀 Déploiement backend + BDD en un clic
- 🔗 URL : https://railway.app

---

## 🚀 Hébergement Backend

### Option 1 : Railway (le plus simple)

**Avantages :**
- Backend + BDD PostgreSQL en un seul endroit
- Déploiement automatique depuis GitHub
- HTTPS automatique

**Étapes :**
1. Créer un compte Railway
2. "New Project" → "Deploy from GitHub repo"
3. Sélectionner le repo `Transport`
4. Ajouter un service PostgreSQL
5. Configurer les variables d'environnement (voir section suivante)
6. Railway génère une URL HTTPS automatiquement (ex: `https://transport-production.up.railway.app`)

### Option 2 : Render (gratuit avec limitations)

**Avantages :**
- Plan gratuit disponible
- HTTPS automatique
- Déploiement depuis GitHub

**Limitations :**
- Service s'endort après 15 min d'inactivité (démarrage lent)
- 750h/mois gratuites

**Étapes :**
1. Créer un compte Render
2. "New Web Service" → connecter GitHub
3. Sélectionner le dossier `backend`
4. Build Command : `npm install && npm run build`
5. Start Command : `npm run start:prod`
6. Ajouter les variables d'environnement

### Option 3 : VPS (DigitalOcean, Linode, etc.)

Pour un contrôle total, mais nécessite configuration manuelle (Nginx, PM2, SSL, etc.)

---

## 🔧 Variables d'environnement Backend (Production)

### Fichier `.env` complet pour production

```env
# Application
NODE_ENV=production
PORT=3000
APP_URL=https://ton-backend.railway.app

# CORS : Autoriser le frontend Vercel + domaine custom
ALLOWED_ORIGINS=https://transport-six-xi.vercel.app,https://vtcdakar.com

# Database PostgreSQL (fournie par Neon/Supabase/Railway)
DATABASE_URL=postgresql://user:password@host:5432/dbname?sslmode=require

# JWT (générer des secrets forts en production)
JWT_ACCESS_SECRET=CHANGE_ME_LONG_RANDOM_STRING_64_CHARS_MIN
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_SECRET=CHANGE_ME_ANOTHER_LONG_RANDOM_STRING_64_CHARS_MIN
JWT_REFRESH_EXPIRES_IN=7d

# Email SMTP (Gmail ou SendGrid)
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USER=votre.email@gmail.com
MAIL_PASS=xxxx xxxx xxxx xxxx
MAIL_FROM=votre.email@gmail.com
MAIL_FROM_NAME=VTC Dakar

# WhatsApp Support
WHATSAPP_SUPPORT_NUMBER=221XXXXXXXXX

# Sentry (monitoring erreurs, optionnel)
SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx

# Admin initial
ADMIN_EMAIL=admin@vtcdakar.com
ADMIN_PASSWORD=CHANGE_ME_STRONG_PASSWORD
```

---

## 🌍 Configuration Domaine Custom

### 1. Acheter un domaine

Registrars recommandés :
- **Namecheap** (pas cher, interface simple)
- **Cloudflare Registrar** (prix coûtant, sécurité incluse)
- **Google Domains** (simple, fiable)

### 2. Configurer DNS pour le frontend (Vercel)

**Dans Vercel :**
1. Aller dans Settings → Domains
2. Ajouter ton domaine (ex: `vtcdakar.com`)
3. Vercel te donne des enregistrements DNS à configurer

**Dans ton registrar (Namecheap, etc.) :**
Ajouter ces enregistrements DNS :

```
Type   Name   Value
A      @      76.76.21.21
CNAME  www    cname.vercel-dns.com
```

**Délai :** Propagation DNS = 5 min à 48h (généralement < 1h)

### 3. Configurer DNS pour le backend

Si tu héberges le backend sur Railway/Render, ils fournissent une URL HTTPS automatique.

Si tu veux un sous-domaine custom (ex: `api.vtcdakar.com`) :

**Dans ton registrar :**
```
Type   Name   Value
CNAME  api    ton-backend.railway.app
```

---

## 🔄 Workflow de mise à jour

### Quand tu changes de domaine

#### Frontend (Vercel)
1. Ajouter le nouveau domaine dans Vercel → Settings → Domains
2. Configurer les DNS chez ton registrar
3. **Aucun changement de code nécessaire**

#### Backend
1. Mettre à jour `ALLOWED_ORIGINS` dans `.env` :
   ```env
   ALLOWED_ORIGINS=https://ancien-domaine.com,https://nouveau-domaine.com
   ```
2. Redémarrer le backend
3. Tester que le frontend peut appeler l'API
4. Retirer l'ancien domaine de `ALLOWED_ORIGINS` quand tout fonctionne

### Quand tu changes d'hébergeur BDD

1. Exporter les données de l'ancienne BDD :
   ```bash
   pg_dump -h ancien-host -U user -d dbname > backup.sql
   ```

2. Importer dans la nouvelle BDD :
   ```bash
   psql -h nouveau-host -U user -d dbname < backup.sql
   ```

3. Mettre à jour `DATABASE_URL` dans `.env` du backend

4. Redémarrer le backend

---

## 🔐 Sécurité Production

### Checklist sécurité

- [ ] Secrets JWT longs et aléatoires (64+ caractères)
- [ ] `NODE_ENV=production` dans `.env`
- [ ] HTTPS activé partout (frontend + backend)
- [ ] Credentials SMTP sécurisés (mot de passe d'application, pas le mot de passe principal)
- [ ] Variables d'environnement **jamais** commitées dans Git
- [ ] Mot de passe admin fort (12+ caractères, majuscules, chiffres, symboles)
- [ ] CORS configuré strictement (pas de wildcard `*`)
- [ ] Rate limiting activé (déjà configuré dans le backend)

---

## 📊 Monitoring & Logs

### Logs Backend

#### Railway
- Dashboard → Service → Logs (temps réel)

#### Render
- Dashboard → Logs

### Logs Frontend (Vercel)

- Dashboard → Deployments → [Deployment] → Runtime Logs

### Monitoring erreurs (Sentry)

1. Créer un compte gratuit : https://sentry.io
2. Créer un projet NestJS
3. Copier le DSN fourni
4. Ajouter dans `.env` :
   ```env
   SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
   ```
5. Les erreurs backend seront automatiquement trackées

---

## 🆘 Troubleshooting

### ❌ Erreur CORS après changement de domaine

**Symptôme :** `CORS: origin https://nouveau-domaine.com not allowed`

**Solution :**
1. Vérifier que `ALLOWED_ORIGINS` contient le nouveau domaine
2. Redémarrer le backend
3. Vider le cache navigateur (Ctrl+Shift+R)

### ❌ Frontend ne peut pas joindre le backend

**Symptôme :** `Failed to fetch` ou `Network Error`

**Checklist :**
- [ ] Backend est bien démarré et accessible
- [ ] URL backend correcte dans le frontend (variable d'environnement Vercel)
- [ ] CORS configuré correctement
- [ ] Backend en HTTPS (requis si frontend en HTTPS)

### ❌ Base de données inaccessible

**Symptôme :** `Connection refused` ou `Timeout`

**Solutions :**
- Vérifier `DATABASE_URL` dans `.env`
- Vérifier que la BDD autorise les connexions externes
- Vérifier le firewall/whitelist IP (certains hébergeurs limitent les IPs autorisées)

---

## 📞 Support

- **Documentation NestJS :** https://docs.nestjs.com
- **Documentation Vercel :** https://vercel.com/docs
- **Documentation Railway :** https://docs.railway.app
- **Documentation Neon :** https://neon.tech/docs

---

## 🎯 Résumé rapide

### Pour déployer maintenant (sans domaine custom)

1. **Backend :**
   - Créer compte Railway
   - Déployer depuis GitHub
   - Ajouter PostgreSQL
   - Configurer `.env` avec `ALLOWED_ORIGINS=https://transport-six-xi.vercel.app`
   - Noter l'URL backend générée (ex: `https://transport-production.up.railway.app`)

2. **Frontend (Vercel) :**
   - Aller dans Settings → Environment Variables
   - Ajouter `NEXT_PUBLIC_API_URL=https://transport-production.up.railway.app/api/v1`
   - Redéployer

3. **Tester :**
   - Ouvrir `https://transport-six-xi.vercel.app`
   - Créer une réservation
   - Vérifier que l'API répond

### Pour ajouter un domaine custom plus tard

1. Acheter domaine (ex: `vtcdakar.com`)
2. Configurer DNS selon section "Configuration Domaine Custom"
3. Ajouter domaine dans Vercel
4. Mettre à jour `ALLOWED_ORIGINS` backend
5. Redémarrer backend
