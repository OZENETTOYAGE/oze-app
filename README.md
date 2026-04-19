# OZÉ Nettoyage — Application de gestion

Application web progressive (PWA) pour la gestion des interventions, pointage terrain et facturation.

## 🚀 Fonctionnalités

- **Connexion sécurisée** par PIN personnel (multi-rôles)
- **Pointage QR Code** sur les chantiers avec caméra
- **Cahier des charges** multilingue (FR, EN, ES, AR, PT)
- **Devis & Factures** avec export PDF et Excel
- **Synchronisation temps réel** via Supabase
- **PWA installable** sur iPhone et Android

## 👥 Rôles

| Rôle | Accès |
|------|-------|
| 👑 Administrateur | Tout |
| 📋 Administratif | Chantiers, clients, devis, factures |
| 👷 Salarié | Pointage, chantiers |

## 🛠️ Installation locale

```bash
npm install
npm run dev
```

## 🏗️ Build & Déploiement

```bash
npm run build
# Glisser le dossier dist/ sur Netlify
```

## ⚙️ Configuration Supabase

Les clés sont dans `src/App.jsx` :
```js
const SUPA_URL = "https://xxxx.supabase.co"
const SUPA_KEY = "sb_publishable_..."
```

## 📱 Installation mobile

Ouvrir l'URL dans Safari (iPhone) ou Chrome (Android) → Ajouter à l'écran d'accueil
