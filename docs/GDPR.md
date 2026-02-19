# Conformità GDPR

Questo documento descrive le misure implementate per la conformità al Regolamento UE 2016/679 (GDPR).

## Diritti implementati

### Diritto di accesso (Art. 15)
- **API:** `GET /api/gdpr/export`
- **UI:** Profilo utente → "Esporta i miei dati"
- Esporta in JSON: dati utente, elenco rapportini creati

### Diritto alla cancellazione (Art. 17)
- **API:** `DELETE /api/gdpr/delete-account`
- **UI:** Profilo utente → "Elimina account"
- Soft delete: disattivazione account, anonimizzazione dati sensibili
- Vincoli: ultimo admin non eliminabile, rapportini da riassegnare

### Diritto di rettifica (Art. 16)
- Già implementato: modifica profilo, modifica clienti, modifica rapportini

## Documentazione

- **Privacy Policy:** `/privacy` - Informativa completa
- **Cookie:** Solo tecnici (autenticazione), nessun profiling

## Misure tecniche

- Cifratura in transito (HTTPS)
- Autenticazione JWT
- Separazione dati per organizzazione (org_id)
- RLS su Supabase

## Conservazione dati

- Documenti contabili: 10+ anni (obbligo di legge)
- Dati utente disattivati: cancellazione secondo policy retention
- Log: periodo definito dall'organizzazione

## Contatti

Per richieste GDPR: contattare l'amministratore dell'organizzazione o il titolare del trattamento.
