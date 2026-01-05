# Rapportini Stufe - Sistema Gestione Interventi

Sistema standalone per la gestione dei rapportini di assistenza su stufe a pellet e legno.

## Caratteristiche

- ✅ Creazione rapportini completi con dati operatore, cliente e intervento
- ✅ Gestione interventi per stufe a pellet e legno
- ✅ Personalizzazione logo azienda
- ✅ Esportazione/Importazione dati (JSON)
- ✅ Visualizzazione e stampa rapportini
- ✅ Interfaccia moderna e responsive
- ✅ Storage locale (localStorage)

## Installazione

```bash
npm install
```

## Avvio

Sviluppo:
```bash
npm run dev
```

Produzione:
```bash
npm run build
npm start
```

L'applicazione sarà disponibile su [http://localhost:3000](http://localhost:3000)

## Utilizzo

1. **Configurazione Azienda**: Clicca su "Impostazioni" nell'header per personalizzare il logo e il nome azienda
2. **Creazione Rapportino**: Clicca su "Nuovo Rapportino" e compila i tre step:
   - Dati Operatore
   - Dati Cliente
   - Dati Intervento
3. **Visualizzazione**: Clicca su "Visualizza" per vedere il dettaglio completo del rapportino
4. **Stampa**: Nella vista dettaglio, clicca su "Stampa" per stampare il rapportino
5. **Esportazione**: Usa "Esporta" per salvare tutti i rapportini in formato JSON
6. **Importazione**: Usa "Importa" per caricare rapportini da un file JSON

## Tecnologie

- Next.js 14
- React 18
- TypeScript
- Tailwind CSS
- date-fns

## Personalizzazione

Il sistema è progettato per essere facilmente personalizzabile. Attualmente supporta:
- Personalizzazione logo azienda
- Personalizzazione nome azienda

Per ulteriori personalizzazioni, modificare i file in `/components` e `/app`.
