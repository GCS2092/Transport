# Configuration Email SMTP

## Variables d'environnement requises

Créez un fichier `.env` à la racine du backend avec ces variables :

```env
# Email SMTP
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USER=votre.adresse@gmail.com
MAIL_PASS=xxxx xxxx xxxx xxxx
MAIL_FROM=votre.adresse@gmail.com
MAIL_FROM_NAME=VTC Dakar

# WhatsApp Support (optionnel)
WHATSAPP_SUPPORT_NUMBER=221XXXXXXXXX

# Frontend URL (pour les liens dans les emails)
FRONTEND_URL=http://localhost:3002
```

---

## Options SMTP recommandées

### 1. **Gmail** (gratuit, 500 emails/jour)
```env
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USER=votre.adresse@gmail.com
MAIL_PASS=xxxx xxxx xxxx xxxx  # Mot de passe d'application
MAIL_FROM=votre.adresse@gmail.com
```

**Étapes :**
1. Activer la validation en 2 étapes sur votre compte Google
2. Générer un mot de passe d'application : https://myaccount.google.com/apppasswords
3. Utiliser ce mot de passe (16 caractères avec espaces) dans `MAIL_PASS`

---

### 2. **Mailtrap** (dev/test uniquement, emails ne partent pas vraiment)
```env
MAIL_HOST=sandbox.smtp.mailtrap.io
MAIL_PORT=587
MAIL_USER=votre_username_mailtrap
MAIL_PASS=votre_password_mailtrap
MAIL_FROM=noreply@vtcdakar.com
```

**Avantages :** Parfait pour tester sans envoyer de vrais emails. Créez un compte gratuit sur https://mailtrap.io

---

### 3. **SendGrid** (production, 100 emails/jour gratuit)
```env
MAIL_HOST=smtp.sendgrid.net
MAIL_PORT=587
MAIL_USER=apikey
MAIL_PASS=SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
MAIL_FROM=noreply@vtcdakar.com
```

**Étapes :**
1. Créer un compte SendGrid : https://sendgrid.com
2. Générer une API Key dans Settings → API Keys
3. Utiliser `apikey` comme username et votre clé API comme password

---

### 4. **Brevo (ex-Sendinblue)** (production, 300 emails/jour gratuit)
```env
MAIL_HOST=smtp-relay.brevo.com
MAIL_PORT=587
MAIL_USER=votre.email@example.com
MAIL_PASS=votre_cle_smtp_brevo
MAIL_FROM=noreply@vtcdakar.com
```

---

## Vérifier que les emails fonctionnent

### 1. Vérifier les logs backend
```bash
# Dans le terminal backend, cherchez :
Email sent [RESERVATION_CONFIRMED] to client@example.com
# ou
Email failed [RESERVATION_CONFIRMED] to client@example.com (attempt 1): Error message
```

### 2. Consulter la table `email_log`
```sql
SELECT * FROM email_log ORDER BY "createdAt" DESC LIMIT 10;
```

Colonnes importantes :
- `status` : `ENVOYE` (succès) ou `ECHEC` (erreur)
- `errorMessage` : détails de l'erreur si échec
- `attempts` : nombre de tentatives (max 3)

### 3. Tester manuellement
Créez une réservation via le frontend → un email de confirmation devrait partir immédiatement.

---

## Problèmes courants

### ❌ `Error: Invalid login`
**Cause :** Mauvais username/password SMTP  
**Solution :** Vérifiez `MAIL_USER` et `MAIL_PASS` dans `.env`

### ❌ `Error: Connection timeout`
**Cause :** Port bloqué ou mauvais host  
**Solution :** Vérifiez `MAIL_HOST` et `MAIL_PORT` (587 pour STARTTLS, 465 pour SSL)

### ❌ `Error: self signed certificate`
**Cause :** Certificat SSL non reconnu (rare)  
**Solution :** Ajoutez `tls: { rejectUnauthorized: false }` dans `notifications.service.ts` (déconseillé en prod)

### ❌ Emails partent mais n'arrivent jamais
**Cause :** Bloqués par le spam  
**Solution :**
- Vérifiez le dossier spam du destinataire
- Configurez SPF/DKIM pour votre domaine (si email custom)
- Utilisez un service professionnel (SendGrid, Brevo)

---

## Code actuel (notifications.service.ts)

Le service email utilise **Nodemailer** avec retry automatique (3 tentatives) :

```typescript
this.transporter = createTransport({
  host: process.env.MAIL_HOST,
  port: parseInt(process.env.MAIL_PORT, 10) || 587,
  secure: false, // true pour port 465
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});
```

Emails envoyés automatiquement :
- ✅ Confirmation de réservation
- ✅ Chauffeur assigné
- ✅ Rappel J-1
- ✅ Course démarrée
- ✅ Course terminée (avec reçu PDF)
- ✅ Annulation
- ✅ Notifications chauffeur (nouvelle course, annulation)

---

## Checklist de démarrage

- [ ] Créer fichier `.env` à la racine du backend
- [ ] Copier les variables depuis `.env.example`
- [ ] Configurer un compte SMTP (Gmail recommandé pour démarrer)
- [ ] Remplir `MAIL_HOST`, `MAIL_PORT`, `MAIL_USER`, `MAIL_PASS`, `MAIL_FROM`
- [ ] Redémarrer le backend : `npm run start:dev`
- [ ] Créer une réservation test
- [ ] Vérifier les logs backend pour `Email sent`
- [ ] Vérifier la table `email_log` dans PostgreSQL
- [ ] Consulter la boîte mail du client

---

## Support

Si les emails ne partent toujours pas après configuration :
1. Vérifiez les logs backend (`Email failed`)
2. Consultez `email_log.errorMessage` dans la base
3. Testez avec Mailtrap d'abord (pour éliminer les problèmes SMTP)
4. Vérifiez que le backend a bien accès à `.env` (redémarrage requis après modification)
