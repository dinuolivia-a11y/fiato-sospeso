# Fiato Sospeso 🧪

Copia sistemata. L’originale resta com’era: questa cartella è un’altra versione, con cinque correzioni e nient’altro cambiato.

- Il microfono di «Prova la fiala» si spegne quando torni indietro. Resta aperto solo mentre si gioca in modalità notte.
- Durante il turno c’è «Annulla». Due tocchi, e si esce: serve se la calibrazione non parte.
- Se il telefono va in pausa mentre il pericolo è già alto, conta come esplosione. Se è ancora calmo, il turno si rifà.
- Principianti, Normale e Chirurgo valgono anche in modalità dito: cambia la grandezza e la velocità del cerchio.
- In modalità dito, incassare con un secondo dito non viene più letto come uno stacco del primo.

Il numero più pericoloso della serata: tenere in mano una fiala di nitroglicerina mentre tutti cercano di farti ridere.

Un gioco di gruppo per adulti, da 2 a 10 persone, con un solo telefono. Il telefono diventa una fiala instabile: chi la tiene sul palmo aperto deve fare una sfida senza tremare, mentre il pubblico fa di tutto per farlo ridere. Più a lungo resiste, più punti accumula, ma la fiala diventa sempre più sensibile. Si incassa quando si vuole; se esplode prima, i punti in gioco sono persi.

Non serve comprare niente e non serve installare niente: è una sola pagina web.

## Come si gioca

1. Aprite `index.html` sul telefono.
2. Prima di cominciare usate «Prova la fiala» per scegliere la sensibilità: Principianti, Normale o Chirurgo.
3. In «Nuova partita» scrivete i nomi e scegliete il livello delle sfide:
   - **Soft**: va bene con tutti.
   - **Ironico**: per adulti che amano prendersi in giro.
   - **Piccante**: flirt e appuntamenti, mai volgare. Solo se tutto il gruppo è d’accordo.
4. Bloccate la rotazione dello schermo e giocate sopra un divano o un cuscino.

Le regole complete sono dentro il gioco, in «Come si gioca».

### Modalità

- **Sensore di movimento**: la fiala sente tremori e inclinazioni del telefono.
- **Modalità dito**: se il sensore non è disponibile, si tiene un dito dentro un cerchio che si sposta nella fiala. Il gioco la propone da solo quando serve.
- **Modalità notte**: il telefono ascolta anche la stanza e la fiala esplode se c’è troppo rumore. Si gioca sussurrando.

## Pubblicarlo con GitHub Pages

Il gioco è già tutto dentro `index.html`, quindi GitHub Pages lo pubblica così com’è:

1. Caricate il progetto in un repository GitHub.
2. Aprite **Settings → Pages**.
3. In «Build and deployment» scegliete **Deploy from a branch**, poi il ramo `main` e la cartella `/ (root)`.
4. Dopo un minuto il gioco è online su `https://<utente>.github.io/<nome-repository>/`.

Su un indirizzo tutto suo, in HTTPS, il sensore di movimento funziona anche su iPhone, che lo blocca dentro molte anteprime e app.

## Installarlo sul telefono come un’app

Una volta online su GitHub Pages, il gioco si installa senza passare dagli store:

- **iPhone (Safari):** aprite l’indirizzo, toccate il pulsante Condividi e poi «Aggiungi alla schermata Home».
- **Android (Chrome):** aprite l’indirizzo, toccate il menu ⋮ e poi «Installa app» oppure «Aggiungi a schermata Home».

Da quel momento Fiato Sospeso ha la sua icona, si apre a tutto schermo e funziona anche senza internet. Su Android resta sempre in verticale, quindi non serve bloccare la rotazione.

Quando pubblicate una nuova versione, il telefono la scarica da solo in sottofondo: si vede alla riapertura successiva.

## Com’è fatto

```
fiato-sospeso/
├── index.html              il gioco completo, pronto da aprire o pubblicare
├── manifest.webmanifest    nome, icona e colori quando il gioco è installato come app
├── sw.js                   salva il gioco sul telefono per giocare senza internet
├── icons/                  le icone dell’app
├── src/
│   ├── shell.html          struttura della pagina e stile grafico
│   ├── content.js          tutti i testi: sfide, complicazioni, penitenze
│   └── app.js              il motore: sensori, fiala animata, suoni, turni, punti
├── tools/
│   └── build.py            riassembla index.html a partire da src/
└── tests/
    ├── test_modalita_dito.py   partita simulata in modalità dito
    └── test_sensore.py         partita simulata con il sensore di movimento
```

`index.html` si genera dai tre file in `src/`. Se modificate qualcosa in `src/`, rigenerate il gioco con:

```
python3 tools/build.py
```

### Aggiungere o cambiare le sfide

Tutti i testi sono in `src/content.js`, divisi per livello (`soft`, `ironico`, `piccante`):

- `{X}` e `{Y}` diventano automaticamente i nomi di altri giocatori.
- Una sfida che comincia con `!` richiede la voce alta, quindi in modalità notte viene saltata.
- Nelle complicazioni, `noisy: true` le esclude in modalità notte e `motion: true` le esclude in modalità dito. Il campo `fx` attiva un effetto speciale: `double` punti doppi, `blind` indicatore spento, `calm` tregua di qualche secondo, `hot` fiala più instabile ma punti più veloci.

### Le prove automatiche

Le due prove giocano una partita intera in un browser simulato e salvano le schermate nella cartella `screenshot/`. Servono Python 3 e Playwright:

```
pip install playwright
playwright install chromium
python3 tests/test_modalita_dito.py
python3 tests/test_sensore.py
```

Se tutto va bene, alla fine stampano `ERRORS: none`.

## Dettagli tecnici

- Nessuna libreria esterna: HTML, CSS e JavaScript semplici. Da internet arrivano solo i caratteri (Ultra e Bricolage Grotesque, da Google Fonts).
- Suoni sintetizzati al momento con la Web Audio API: nessun file audio.
- Le preferenze (nomi, livello, sensibilità) restano salvate nel browser del telefono.
