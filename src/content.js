/* Fiato Sospeso — contenuti.
   {X} e {Y} diventano nomi di altri giocatori.
   Una sfida che comincia con "!" richiede la voce alta: in modalità notte viene saltata. */

const SFIDE = {
  soft: [
    "Ripeti due volte, sempre più veloce: «Trentatré trentini entrarono a Trento, tutti e trentatré trotterellando».",
    "Racconta il sogno più assurdo che ricordi. Gli altri possono farti domande.",
    "Fai il verso di tre animali diversi: gli altri indovinano quali.",
    "Alzati in piedi, fai una giravolta completa e torna a sederti.",
    "Elenca cinque cose gialle senza mai dire «ehm». Se ti blocchi, ricomincia.",
    "Descrivi {X} con tre aggettivi. Il gruppo vota se sono azzeccati.",
    "!Canta il ritornello di una canzone per bambini con la voce di un cantante d’opera.",
    "Racconta la tua mattina come la telecronaca della finale dei Mondiali.",
    "Qual è il cibo che proprio non sopporti? Spiega perché, con passione.",
    "Chiudi gli occhi e di’ i nomi di tutti i presenti, nell’ordine in cui sono seduti.",
    "Parla per 15 secondi di un oggetto della stanza come se fosse un tesoro inestimabile.",
    "Fai l’annuncio del capotreno: il treno per il divano viaggia con 40 minuti di ritardo.",
    "Racconta una cosa che sai fare e che nessuno qui immagina.",
    "{X} sceglie una parola a caso. Tu la usi in una frase che commuova tutti.",
    "Imita la risata di {X}. Attenzione: potrebbe venire da ridere anche a te.",
    "Conta alla rovescia da 21 a 1, saltando i numeri pari.",
    "Descrivi la tua colazione ideale con la voce di un documentario sugli animali.",
    "Guarda {X} negli occhi per 10 secondi, in silenzio assoluto.",
    "Sei un robot che si sta scaricando: parla sempre più piano e sempre più lento.",
    "Per 20 secondi rispondi solo «sì» o «no» alle domande di tutti.",
    "Racconta la tua ultima figuraccia, anche piccola.",
    "Recita i giorni della settimana al contrario, con la voce di un pirata.",
    "Fai tre complimenti sinceri a {X}, senza distogliere lo sguardo.",
    "Inventa una pubblicità di 10 secondi per il divano di questa casa.",
    "Tutti ti fanno una smorfia nello stesso momento. Resisti 5 secondi.",
    "Spiega come si prepara il caffè a qualcuno che arriva dal futuro.",
    "Pronuncia il tuo nome al contrario, lettera per lettera.",
    "Racconta la vacanza più bella della tua vita in tre frasi esatte.",
    "Muovi solo le sopracciglia per 10 secondi, come se stessi dicendo una cosa seria.",
    "Fatti un’intervista: le domande con una voce, le risposte con un’altra.",
    "Di’ il titolo di un film per ogni lettera della parola «FIALA».",
    "Dirigi il traffico come un vigile, usando solo la mano libera.",
    "Racconta una barzelletta. Se nessuno ride, ne racconti un’altra.",
    "{X} ti fa tre domande a raffica: rispondi senza pensarci.",
    "Descrivi la tua giornata tipo come se fosse un film d’azione.",
    "Mantieni una faccia impassibile mentre tutti ti fissano per 10 secondi.",
    "Canticchia una canzone famosa senza parole: gli altri devono indovinarla.",
    "Cinque cose che porteresti su un’isola deserta. Il telefono non vale.",
    "!Fai il verso della gallina tre volte, sempre più forte. La mano resta immobile.",
    "Spiega le regole di questo gioco a {X} come se avesse cinque anni.",
    "Alzati, fai tre passi avanti e tre indietro, poi torna al tuo posto.",
    "Qual era il lavoro dei tuoi sogni alle elementari? Fai vedere come lo faresti.",
    "Dai a ogni persona presente un nome d’arte da circo.",
    "Mima un mestiere con la mano libera: gli altri indovinano quale."
  ],
  ironico: [
    "Confessa l’ultima bugia che hai detto. Il gruppo decide se crederti.",
    "Imita {X} quando è di cattivo umore. Senza pietà.",
    "Qual è la cosa più inutile che hai comprato quest’anno? Difendila come un affare.",
    "Il peggior regalo che hai mai ricevuto. Se chi te l’ha fatto è qui, pazienza.",
    "!Fai il comizio di chi si candida ad amministratore di condominio. Promesse assurde obbligatorie.",
    "Chi dei presenti durerebbe meno in un’apocalisse zombie? Motiva.",
    "Racconta l’ultima riunione di lavoro, o di famiglia, come se fosse un reality.",
    "Una cosa che ti imbarazza ancora, anche se sono passati anni.",
    "{X} ti fa una domanda. Devi rispondere con sincerità assoluta.",
    "Sei un navigatore satellitare che ha perso la pazienza: dai indicazioni a {X}.",
    "Qual è l’abitudine di {X} che ti fa più ridere? Imitala.",
    "Recensisci questa serata come un critico gastronomico spietato.",
    "La scusa più assurda che hai usato per non andare da qualche parte.",
    "!Canta una canzone qualsiasi come se fosse una disperata canzone d’amore.",
    "Vendi a {X} un oggetto invisibile a un prezzo esagerato. {X} decide se comprarlo.",
    "Qual è il tuo talento più inutile? Dimostralo, se ci riesci senza muovere la mano.",
    "Il peggior appuntamento della tua vita, anche di lavoro, in 20 secondi.",
    "Dai un soprannome a ogni persona presente. Affettuoso, più o meno.",
    "Sei l’assistente vocale di questa casa: gli altri ti fanno richieste, tu rispondi.",
    "Fai il discorso di ringraziamento per l’Oscar alla miglior fiala tenuta in mano.",
    "Chi dei presenti chiameresti per nascondere un cadavere? E chi mai e poi mai?",
    "Leggi il biscotto della fortuna di {X}. Lo inventi tu, e dev’essere profetico.",
    "Sei un cameriere snob: presenta il menù di stasera con disprezzo.",
    "Chi dei presenti finirebbe più facilmente in un talent show? A fare cosa?",
    "Racconta una litigata stupida che hai avuto di recente, dando ragione all’altra persona.",
    "Parla per 15 secondi senza mai usare la lettera A.",
    "Detta una lettera formale di scuse alla tua dieta.",
    "Imita un tuo parente mentre ti dà un consiglio che non hai chiesto.",
    "Il complimento più strano che ti abbiano mai fatto.",
    "Fai le previsioni del tempo per il tuo umore di domani.",
    "Cosa c’è nella tua cronologia di ricerca? Solo la versione presentabile.",
    "Conversa con {X} usando solo domande. Chi risponde con un’affermazione perde.",
    "Cosa hai pensato la prima volta che hai incontrato {X}?",
    "Lascia a {X} un vocale immaginario, di quelli infiniti.",
    "La tua giornata perfetta, se nessuno potesse giudicarti.",
    "Fai la pubblicità di un profumo: voce sussurrata e nome inventato.",
    "Qual è la regola di casa tua che gli ospiti non capiscono mai?",
    "{X} e {Y} ti raccontano una scusa ciascuno. Tu scegli la più credibile.",
    "Presentati come ti presenterebbe tua madre a una festa.",
    "Una cosa che hai sempre fatto finta di capire.",
    "Fai un brindisi commosso e un po’ esagerato in onore di {X}.",
    "Qual è la cosa più da anziani che fai già adesso?",
    "Come sarai tra trent’anni al pranzo della domenica? Fai la scena.",
    "Racconta un tuo piccolo vizio segreto. Piccolo, eh."
  ],
  piccante: [
    "Racconta il tuo primo bacio: dove, quando e com’è andata davvero.",
    "La frase da rimorchio più terribile che ti hanno detto, o che hai usato tu.",
    "Fai la tua faccia più seducente a {X} per 5 secondi. Nessuno dei due deve ridere.",
    "Descrivi il tuo appuntamento ideale in tre dettagli.",
    "Chi dei presenti ha lo sguardo più magnetico? Dillo guardando quella persona negli occhi.",
    "Leggi con la voce più sensuale che hai: «La lavastoviglie ha finito. La svuoti tu?»",
    "Qual è la cosa più audace che hai fatto per conquistare qualcuno?",
    "Il peggior appuntamento della tua vita, in 20 secondi.",
    "Il dettaglio che ti fa perdere la testa in una persona.",
    "Fai a {X} un complimento audace, ma elegante.",
    "Dichiara il tuo amore alla fiala, come in un film romantico. Senza emozionarla troppo.",
    "Hai mai mandato un messaggio alla persona sbagliata? Racconta tutto.",
    "La canzone più sexy di sempre, secondo te. Canticchiane un pezzo.",
    "Descrivi {X} come il personaggio principale di un romanzo rosa.",
    "La tua cotta più imbarazzante.",
    "Racconta un appuntamento finito in modo del tutto inaspettato.",
    "Mima con la mano libera il tuo modo di flirtare. Gli altri commentano.",
    "Chi dei presenti ha il passato sentimentale più movimentato? Motiva, con tatto.",
    "Voce da radio di mezzanotte: «Stanotte, cari ascoltatori… parliamo di bollette.»",
    "La cosa più romantica che qualcuno abbia mai fatto per te.",
    "Cosa noti per primo in una persona che ti piace? La verità.",
    "Fai la scena di come ti comporti al primo appuntamento.",
    "La dichiarazione d’amore più goffa che hai fatto o ricevuto.",
    "Tu e {X} vi guardate come in un film romantico per 10 secondi. Chi ride per primo ha perso.",
    "Il tuo punto debole in fatto di seduzione. Il cibo vale.",
    "Descrivi il bacio perfetto usando solo parole di cucina.",
    "Con chi dei presenti fingeresti di essere una coppia per farti offrire il dolce al ristorante?",
    "Rispondi di getto: meglio un bacio rubato o una lettera d’amore? Perché?",
    "Ordina una pizza al telefono come in un film romantico anni Settanta.",
    "La cosa più folle che hai fatto per una persona che ti piaceva.",
    "Cosa trovi più affascinante in una persona, fisicamente? Rispondi con classe.",
    "{X} ti fa una domanda piccante. Se non vuoi rispondere, canti al posto della risposta.",
    "La tua definizione di «tentazione», in una frase.",
    "Racconta un sogno romantico, o imbarazzante, che ricordi bene.",
    "Recita la lista della spesa come se fosse una poesia d’amore.",
    "Ti è mai capitato di fingere di essere qualcun altro per fare colpo? Racconta.",
    "Chi dei presenti sarebbe la spalla perfetta per rimorchiare? E chi il disastro totale?",
    "Da 1 a 10, quanto è irresistibile il tuo fascino? Gli altri possono contestare.",
    "L’outfit che ti fa sentire irresistibile. Descrivilo nei dettagli.",
    "Fai l’occhiolino a ogni persona presente, una alla volta, senza ridere.",
    "Il messaggio più imbarazzante che hai mandato a qualcuno che ti piaceva.",
    "Sussurra a {X} la frase più romantica che conosci. A distanza di sicurezza."
  ]
};

/* fx: double = punti doppi, blind = indicatore spento, calm = tregua di 6 secondi,
   hot = più instabile ma punti più veloci. noisy = esclusa in modalità notte,
   motion = solo con il sensore di movimento. */
const COMPLICAZIONI = {
  tutte: [
    { t: "Alzati in piedi. Lentamente." },
    { t: "Chiudi gli occhi fino a quando incassi.", motion: true },
    { t: "Da adesso il pubblico può fare versi e rumori.", noisy: true },
    { t: "Passa la fiala nell’altra mano.", motion: true },
    { t: "{X} si mette davanti a te e ti fissa, senza dire niente." },
    { t: "Solleva un piede da terra e tienilo su." },
    { t: "Tutti gli altri cantano una canzone a scelta, rigorosamente stonati.", noisy: true },
    { t: "Da ora parli solo in rima." },
    { t: "Sorridi senza mai smettere, anche mentre parli." },
    { t: "{X} può farti una domanda: rispondi subito." },
    { t: "Porta la fiala all’altezza degli occhi, piano piano.", motion: true },
    { t: "Tendi il braccio davanti a te e tienilo teso.", motion: true },
    { t: "Punti doppi: da ora guadagni il doppio. La fiala però non fa sconti.", fx: "double" },
    { t: "Buio in sala: l’indicatore di pericolo si spegne. Vai a sensazione.", fx: "blind" },
    { t: "Respiro profondo: per qualche secondo la fiala si calma.", fx: "calm" },
    { t: "La fiala si scalda: più instabile, ma i punti corrono più veloci.", fx: "hot" },
    { t: "Il pubblico può raccontarti barzellette. Anche brutte. Soprattutto brutte." },
    { t: "Silenzio totale per tutti: ti guardano e basta." },
    { t: "Racconta quello che stai facendo, come un telecronista." },
    { t: "Sei su una nave in mezzo alla tempesta. La mano però resta ferma." }
  ],
  soft: [
    { t: "Diventa una statua del museo: immobile e con aria solenne." },
    { t: "Da ora parli come un personaggio dei cartoni animati." }
  ],
  ironico: [
    { t: "Commenta tutto quello che fa il pubblico, come in una partita di calcio." },
    { t: "Da ora ogni frase finisce con «…e questo è quanto»." }
  ],
  piccante: [
    { t: "{X} ti fa l’occhiolino ogni tre secondi." },
    { t: "Sussurra un complimento a {X}." },
    { t: "Da ora parli con voce sensuale." }
  ]
};

const PENITENZE = {
  soft: [
    "Parla come un robot fino al tuo prossimo turno.",
    "Fai un complimento sincero a ogni persona presente.",
    "Canta «Tanti auguri» a qualcuno che oggi non compie gli anni.",
    "Cinque saltelli sul posto, con entusiasmo.",
    "Fino al prossimo giro, quando qualcuno dice il tuo nome rispondi «Presente!».",
    "Racconta una barzelletta. Anche brutta.",
    "Rifai il rumore dell’esplosione che hai appena causato.",
    "Dai un nome alla fiala e chiedile scusa ufficialmente.",
    "La tua migliore imitazione di un pinguino.",
    "Per un giro intero parli di te in terza persona.",
    "Fai un inchino al pubblico, come a fine spettacolo."
  ],
  ironico: [
    "Chiedi scusa alla fiala in ginocchio. O quasi.",
    "Fino al tuo prossimo turno, ogni frase finisce con «…e questo è quanto».",
    "Fai un discorso motivazionale guardando {X} come se fosse uno specchio.",
    "Racconta la tua figuraccia più grande di sempre.",
    "Imita il tuo capo, o un professore, quando si arrabbia.",
    "{X} sceglie il tuo soprannome per il resto della partita.",
    "Canta il ritornello che sceglie il gruppo, con tutto il sentimento che hai.",
    "Per un giro intero rispondi a tutto con un proverbio.",
    "Fai la telecronaca della tua esplosione, al rallentatore.",
    "Confessa un tuo piccolo vizio segreto."
  ],
  piccante: [
    "Fai una dichiarazione d’amore drammatica… al divano.",
    "Racconta il tuo appuntamento più imbarazzante.",
    "La tua camminata più seducente fino alla porta e ritorno.",
    "Il gruppo sceglie una persona: le dedichi una serenata di 10 secondi.",
    "Descrivi il tuo tipo ideale con tre parole. Gli altri dicono se somiglia a qualcuno qui.",
    "Leggi con voce sensuale gli ingredienti di un prodotto a caso della cucina.",
    "Rispondi con sincerità a una domanda piccante scelta dal gruppo, oppure balla per 10 secondi.",
    "L’occhiolino più seducente che sai fare, a chi hai di fronte.",
    "Saluta i fan come una star del cinema, bacio al volo compreso.",
    "Rifai la faccia che fai quando vedi una persona che ti piace."
  ]
};

const PENITENZE_COPPIA = {
  soft: [
    "Fate insieme il verso di un animale scelto dal gruppo.",
    "Cantate insieme una canzone per bambini, a due voci.",
    "Stringetevi la mano e presentatevi come ambasciatori di due paesi inventati.",
    "Improvvisate insieme un balletto di 5 secondi.",
    "Fatevi un complimento a vicenda, guardandovi negli occhi."
  ],
  ironico: [
    "Litigate per 10 secondi su un argomento assurdo scelto dal gruppo.",
    "Girate in coppia uno spot pubblicitario per la fiala.",
    "Scusatevi a vicenda in modo esageratamente formale.",
    "Recitate una scena da telenovela: «Non sei tu, sono io.»",
    "Commentate l’incidente appena successo come due telecronisti."
  ],
  piccante: [
    "Guardatevi negli occhi per 10 secondi senza ridere.",
    "Fate una dichiarazione d’amore a due voci… alla pizza.",
    "Recitate l’addio di due innamorati in stazione, in 10 secondi.",
    "Ballate un lento immaginario per 5 secondi, senza toccarvi.",
    "Descrivetevi a vicenda il vostro appuntamento ideale."
  ]
};

const QUIP_BANK = [
  "Applausi. La fiala respira di nuovo.",
  "Nessuno è esploso. Per ora.",
  "Mani da chirurgo.",
  "Il pubblico non ci credeva.",
  "Punti in banca, nervi a pezzi.",
  "La fiala ringrazia per la delicatezza."
];

const QUIP_BOOM = [
  "Il vicino ha sentito tutto.",
  "Ridere costa caro.",
  "La fiala non perdona.",
  "Sipario.",
  "Pezzi ovunque. In senso figurato.",
  "Ecco perché si chiama nitroglicerina."
];
