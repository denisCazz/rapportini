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

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. **Configura il database:**

   - Vai su SQL Editor in Supabase
   - Esegui lo script contenuto in `supabase/schema.sql`
   - Questo creerà le tabelle necessarie (utenti, clienti, rapportini)
   - Se hai già un database esistente, esegui prima `supabase/migrate_operatori_to_utenti.sql` per migrare i dati
   - 📖 **Guida dettagliata**: Vedi `GUIDA_SUPABASE.md` per istruzioni passo-passo

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

Il database include tre tabelle principali:

- **operatori**: Dati degli operatori tecnici
- **clienti**: Dati dei clienti
- **rapportini**: Rapportini di intervento con relazioni a operatori e clienti

Vedi `supabase/schema.sql` per i dettagli completi.

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
