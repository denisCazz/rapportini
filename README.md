# Bitora - Gestione Rapportini Stufe

Sistema professionale per la gestione degli interventi su stufe a pellet e legno, con database Supabase e pannello admin per statistiche.

## 🚀 Funzionalità

- ✅ Gestione completa rapportini di intervento
- ✅ Database Supabase per persistenza dati
- ✅ Pannello admin con statistiche raggruppate per cliente
- ✅ UI/UX moderna e professionale
- ✅ Dark mode
- ✅ Esportazione PDF
- ✅ Ricerca e filtri avanzati

## 📋 Prerequisiti

- Node.js 18+ 
- Account Supabase (gratuito)

## 🔧 Installazione

1. **Clona il repository e installa le dipendenze:**

```bash
npm install
```

2. **Configura Supabase:**

   - Crea un progetto su [Supabase](https://supabase.com)
   - Vai su Settings > API e copia:
     - Project URL
     - Anon/Public Key

3. **Crea il file `.env.local`:**

   - Vedi `.env.example` per il template completo
   - **Ambienti TEST/PROD**: usa `APP_ENV=TEST` o `APP_ENV=PROD` per commutare tra due database distinti
   - Variabili per PROD: `*_PROD` (o le variabili senza suffisso per compatibilità)
   - Variabili per TEST: `*_TEST`

```bash
APP_ENV=PROD
NEXT_PUBLIC_APP_ENV=PROD
NEXT_PUBLIC_SUPABASE_URL_PROD=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY_PROD=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY_PROD=your_supabase_service_role_key
```

4. **Configura il database:**

   - Vai su **SQL Editor** in Supabase
   - Esegui **un solo file**: `supabase/schema.sql`
   - Crea tutte le tabelle, indici e RLS
   - 📖 **Guida dettagliata**: Vedi `GUIDA_SUPABASE.md`

5. **Avvia l'applicazione:**

```bash
npm run dev
```

L'applicazione sarà disponibile su [http://localhost:3000](http://localhost:3000)

## 📁 Struttura del Progetto

```
rapportini/
├── app/
│   ├── api/              # API routes per Supabase
│   ├── admin/            # Pagina admin con statistiche
│   ├── login/            # Pagina di login
│   └── page.tsx          # Homepage
├── components/           # Componenti React
├── lib/
│   ├── api.ts           # Client API
│   ├── supabase.ts      # Configurazione Supabase
│   └── ...
├── supabase/
│   └── schema.sql       # Schema database
└── types/               # TypeScript types
```

## 🗄️ Database Schema

Un solo file `supabase/schema.sql` crea tutto:

- **utenti** – Autenticazione (admin/operatore)
- **clienti** – Anagrafica clienti
- **rapportini** – Interventi con firme
- **organizzazioni** – Impostazioni azienda
- **marche, modelli, materiali** – Catalogo stufe
- **password_reset_tokens** – Recupero password

## 🎨 Funzionalità UI/UX

- Design moderno e responsive
- Animazioni fluide
- Dark mode integrata
- Card interattive con hover effects
- Form multi-step con validazione
- Statistiche visuali con grafici

## 📊 Pannello Admin

La pagina admin (`/admin`) è accessibile **solo agli utenti con ruolo admin**.

Mostra:

- Statistiche generali (totale clienti, rapportini, stufe)
- Raggruppamento per cliente
- Statistiche dettagliate per ogni cliente:
  - Numero totale rapportini
  - Distribuzione pellet/legno
  - Tipi di intervento più frequenti
  - Primo e ultimo intervento
  - Storico completo rapportini

## 🔐 Autenticazione

L'autenticazione è gestita tramite database Supabase con due ruoli:

### Ruoli Utente

1. **Admin** - Accesso completo incluso pannello statistiche
2. **Operatore** - Può solo creare e gestire rapportini

### Credenziali di Default

Dopo aver eseguito lo schema SQL, sono disponibili due utenti:

**Admin:**
- Username: `admin`
- Password: `admin123`
- Accesso: Completo (incluso pannello admin)

**Operatore:**
- Username: `operatore`
- Password: `operatore123`
- Accesso: Solo gestione rapportini

⚠️ **IMPORTANTE**: Cambia le password di default dopo il primo accesso in produzione!

## 📝 Note

- I dati vengono salvati automaticamente in Supabase
- Gli operatori e clienti vengono creati automaticamente se non esistono
- I rapportini sono collegati a operatori e clienti tramite relazioni

## 🛠️ Tecnologie Utilizzate

- Next.js 14
- React 18
- TypeScript
- Tailwind CSS
- Supabase
- date-fns
- jsPDF

## 📄 Licenza e Copyright

**Prodotto:** Bitora Software Gestionale Stufe  
**Produttore:** Bitora.it  
**Copyright:** © Bitora.it - Tutti i diritti riservati

"Bitora Software Gestionale Stufe" è un prodotto di Bitora.it. Il brand Bitora e il logo sono proprietà di Bitora.it.
