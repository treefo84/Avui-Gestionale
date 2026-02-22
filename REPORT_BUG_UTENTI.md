# Report Analisi Gestione Utenti ed Errori (Avui Gestionale)

In base all'analisi congiunta di codice sorgente, schema del database, policy RLS e test di simulazione nel browser, ho individuato le precise cause per cui la gestione utenti risulta "instabile" o problematica.

## 1. Analisi Codice-DB e Architettura Attuale
- **Logica di Login Legacy vs Attuale:** Nel repository è presente il file `components/LoginPage.tsx` che esegue un login fittizio confrontando le password in chiaro da un array locale (`u.password === password`). Tuttavia, questo file è **codice morto/legacy**. La VERA logica di autenticazione è inclusa in `App.tsx` e utilizza correttamente le API di Supabase: `supabase.auth.signInWithPassword({ email, password })`.
- **Incongruenze col DB:** Nel file `types.ts` l'interfaccia `User` si aspetta campi come `password` (che non deve mai esistere nel frontend se si usa Supabase Auth) e `avatar` (mentre nel DB la colonna è `avatar_url`).

## 2. Check delle Policy di Sicurezza (RLS)
Il database Supabase ha Row Level Security (RLS) abilitata sulla tabella `public.users`.
Esaminando le policy relative alla tabella `users`:
- `users_select_own`, `users_read_all`: Tutti gli utenti autenticati possono leggere la tabella.
- `users_insert_own`, `users_update_own`: Gli utenti possono creare e aggiornare **solo il proprio record**, validato tramite la condizione `(auth_id = auth.uid())`.

### 🚨 Il blocco critico nella Gestione Utenti
A causa della policy `users_update_own`, **un utente Admin (es. Ammiraglio Trifo) non può modificare i dati di un altro utente dal frontend**.
- **Creazione Utenti:** Quando l'admin crea un utente (da `UserManagementModal.tsx`), il sistema chiama `callAdminUsersFn` (Edge Function Supabase). Questa funzione server-side usa la Service Role per bypassare l'RLS, e quindi funziona regolarmente.
- **Aggiornamento e Cancellazione:** Se le funzioni `onUpdateUser` o `onRemoveUser` all'interno di `App.tsx` eseguono query dirette come `supabase.from('users').update(...)`, queste chiamate verranno silenziate o respinte lato DB per violazione della regola RLS (poiché l'ID riga non coincide col token di chi fa la richiesta). Stesso discorso per il cambio password (che richiede l'Admin API di Supabase Auth).

## 3. Test Silenzioso (Simulazione Browser)
Ho avviato il server dev (Vite, esposto sulla porta 5174) e navigato la UI con un browser virtuale.
- **Form validazione:** Provando ad inserire username `trifo`, il form del browser mi ha bloccato dicendo *"Aggiungi un simbolo '@' nell'indirizzo email"*. Questo conferma che il login in uso `App.tsx` si aspetta una vera mail e non lo username "secco", contrariamente a quanto suggerito dal form in `LoginPage.tsx`.
- **Tentativo Fallito Supabase:** Inserendo `test@test.com` e `Test1234!`, la console di rete ha registrato un errore **400 (Bad Request)** verso `https://ekdkgizpdffueujhmmra.supabase.co/auth/v1/token?grant_type=password` visualizzando il toast UI "Invalid login credentials". L'autenticazione tramite Supabase Auth è quindi **attiva e fa scudo**; senza le credenziali vere o il setup Auth, non si entra.

## 4. Suggerimenti per la Risoluzione

1. **Pulizia del Codice:** Elimina la pagina `LoginPage.tsx` obsoleta per non creare confusione e allinea l'interfaccia `User` in `types.ts` alla vera struttura DB (rimuovendo il campo `password` in chiaro, ridenominando `avatar` in `avatar_url`).
2. **Aggiornamento Utenti Sicuro:** Sposta la logica di `onUpdateUser` e `onRemoveUser` in funzioni Edge (come fatto per `callAdminUsersFn`) per permettere agli Admin di agire su profili altrui e resettare le password aggirando le restrizioni utente.
3. **Miglioramento UI Auth:** Correggi l'interfaccia di login di `App.tsx` per rendere chiaro che l'utente deve inserire la mail e per gestire fluentemente la pipeline di "Password Dimenticata" che nativamente Supabase offre.
