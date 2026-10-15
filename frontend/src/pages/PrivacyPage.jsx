import { Link } from "react-router-dom";

// ⚠️ Doplňte před zveřejněním údaje o správci. Pole, která necháte prázdná (""), se na stránce nezobrazí.
const CONTROLLER = {
  name: "Josef Kubeček",
  ico: "", // IČ – jen pokud ho máte (spolek, živnostník)
  seat: "", // sídlo / bydliště správce
  email: "kubecekpepa8@gmail.com",
  phone: "",
};
const EFFECTIVE_FROM = "13. 10. 2026";

const A = ({ href, children }) => (
  <a className="text-wood underline" href={href} target="_blank" rel="noreferrer">{children}</a>
);

function Article({ no, title, children }) {
  return (
    <section className="mb-8">
      <h2 className="font-display text-center mb-3">
        <span className="block text-sm font-bold text-wood">{no}.</span>
        <span className="block text-xl font-bold uppercase">{title}</span>
      </h2>
      <ol className="list-decimal pl-6 space-y-3 text-sm leading-relaxed text-forest-900 marker:font-semibold">
        {children}
      </ol>
    </section>
  );
}

const Ul = ({ children }) => <ul className="list-disc pl-5 mt-2 space-y-1">{children}</ul>;

export default function PrivacyPage() {
  const c = CONTROLLER;
  const mail = <a className="text-wood underline" href={`mailto:${c.email}`}>{c.email}</a>;

  return (
    <div className="max-w-3xl">
      <h1 className="font-display text-4xl md:text-5xl font-extrabold uppercase tracking-tight mb-2">
        Zásady ochrany osobních údajů
      </h1>
      <p className="text-sm text-forest-700/70 mb-10">webu Pivní štafety</p>

      <Article no="I" title="Základní ustanovení">
        <li>
          Správcem osobních údajů podle čl. 4 bod 7 nařízení Evropského parlamentu a Rady (EU) 2016/679 o ochraně
          fyzických osob v souvislosti se zpracováním osobních údajů a o volném pohybu těchto údajů (dále jen „GDPR“)
          je <strong>{c.name}</strong>
          {c.ico && <>, IČ {c.ico}</>}
          {c.seat && <>, se sídlem {c.seat}</>} (dále jen „správce“), provozovatel webu Pivní štafety.
        </li>
        <li>
          Kontaktní údaje správce jsou:
          <Ul>
            {c.seat && <li>adresa: {c.seat}</li>}
            <li>e-mail: {mail}</li>
            {c.phone && <li>telefon: {c.phone}</li>}
          </Ul>
        </li>
        <li>
          Osobními údaji se rozumí veškeré informace o identifikované nebo identifikovatelné fyzické osobě;
          identifikovatelnou fyzickou osobou je fyzická osoba, kterou lze přímo či nepřímo identifikovat, zejména
          odkazem na určitý identifikátor, například jméno, identifikační číslo, lokační údaje, síťový identifikátor
          nebo na jeden či více zvláštních prvků fyzické, fyziologické, genetické, psychické, ekonomické, kulturní nebo
          společenské identity této fyzické osoby.
        </li>
        <li>Správce nejmenoval pověřence pro ochranu osobních údajů.</li>
      </Article>

      <Article no="II" title="Zdroje a kategorie zpracovávaných osobních údajů">
        <li>
          Správce zpracovává osobní údaje, které jste mu poskytl/a při registraci a používání webu, a osobní údaje,
          které o Vás uvedl kapitán týmu v přihlášce na závod.
        </li>
        <li>
          Správce zpracovává tyto kategorie osobních údajů:
          <Ul>
            <li>identifikační údaje: jméno, příjmení, ročník narození, oddíl,</li>
            <li>kontaktní údaje: e-mail, telefon,</li>
            <li>přihlašovací údaje: e-mail a heslo (ukládá se pouze jako jednosměrný šifrovaný otisk),</li>
            <li>údaje o přihláškách: název týmu, kategorie, sestava po úsecích, startovní číslo, poznámka,</li>
            <li>výsledky: pořadí, čas a údaj o nedokončení závodu,</li>
            <li>technické údaje: IP adresa a záznamy serveru.</li>
          </Ul>
        </li>
        <li>
          Pokud Vás do sestavy uvede kapitán týmu, zpracovává správce Vaše jméno a případně e-mail, který slouží pouze
          k propojení přihlášky s Vaším účtem. Kapitán by Vás o přihlášce měl informovat.
        </li>
      </Article>

      <Article no="III" title="Zákonný důvod a účel zpracování osobních údajů">
        <li>
          Zákonným důvodem zpracování osobních údajů je
          <Ul>
            <li>
              plnění smlouvy mezi Vámi a správcem podle čl. 6 odst. 1 písm. b) GDPR, kterou je poskytování služeb webu
              (vedení účtu a přihlašování na závody),
            </li>
            <li>
              oprávněný zájem správce a pořadatelů podle čl. 6 odst. 1 písm. f) GDPR na zveřejňování startovních listin
              a výsledků závodů a na zajištění bezpečnosti webu.
            </li>
          </Ul>
        </li>
        <li>
          Účelem zpracování osobních údajů je
          <Ul>
            <li>vytvoření a vedení uživatelského účtu,</li>
            <li>
              přihlášení týmu na závod a jeho organizace pořadatelem; bez poskytnutí povinných údajů (jméno, příjmení,
              e-mail) není možné účet založit ani se na závod přihlásit,
            </li>
            <li>zveřejnění startovní listiny a výsledků závodu,</li>
            <li>zajištění provozu a bezpečnosti webu.</li>
          </Ul>
        </li>
        <li>
          Veřejně jsou zobrazeny pouze názvy týmů, oddíly, jména závodníků v sestavách, startovní čísla a výsledky.
          E-mail a telefon veřejně zobrazeny nejsou.
        </li>
        <li>
          Správce nezpracovává osobní údaje pro účely marketingu, nezasílá obchodní sdělení a nepoužívá reklamní ani
          analytické nástroje.
        </li>
        <li>Ze strany správce nedochází k automatickému individuálnímu rozhodování ve smyslu čl. 22 GDPR.</li>
      </Article>

      <Article no="IV" title="Doba uchovávání údajů">
        <li>
          Správce uchovává osobní údaje
          <Ul>
            <li>údaje účtu po dobu existence účtu,</li>
            <li>přihlášky na nadcházející závody do konání závodu, případně do smazání účtu kapitána,</li>
            <li>
              startovní listiny a výsledky proběhlých závodů trvale jako součást historie závodu; po smazání účtu bez
              vazby na účet a bez kontaktních údajů,
            </li>
            <li>zálohy databáze nejvýše 30 dnů.</li>
          </Ul>
        </li>
        <li>
          Účet můžete kdykoli smazat sami v sekci <Link to="/ucet" className="text-wood underline">Můj účet</Link>.
          Smazáním účtu správce vymaže e-mail, telefon a další údaje profilu a zruší Vaše přihlášky na nadcházející
          závody.
        </li>
        <li>Po uplynutí doby uchovávání osobních údajů správce osobní údaje vymaže.</li>
      </Article>

      <Article no="V" title="Příjemci osobních údajů (subdodavatelé správce)">
        <li>
          Příjemci osobních údajů jsou osoby
          <Ul>
            <li>
              podílející se na organizaci závodu – pořadatel závodu, na který se přihlašujete (vidí přihlášky do svého
              závodu včetně kontaktu na kapitána),
            </li>
            <li>
              podílející se na zajištění provozu služeb – Railway Corporation (server a databáze), Vercel Inc.
              (provoz webu), OpenStreetMap Foundation (mapové podklady a vyhledávání adres) a Google LLC (písma
              Google Fonts); poslední dva vidí pouze IP adresu Vašeho prohlížeče.
            </li>
          </Ul>
        </li>
        <li>
          Správce předává osobní údaje do třetích zemí (mimo EU), a to poskytovatelům cloudových služeb uvedeným
          v odst. 1 se sídlem v USA a ve Spojeném království. Předání probíhá na základě rozhodnutí Evropské komise
          o odpovídající ochraně (rámec EU-USA pro ochranu osobních údajů, Spojené království) nebo standardních
          smluvních doložek.
        </li>
        <li>Správce osobní údaje neprodává a nepředává je pro marketingové účely.</li>
      </Article>

      <Article no="VI" title="Vaše práva">
        <li>
          Za podmínek stanovených v GDPR máte
          <Ul>
            <li>právo na přístup ke svým osobním údajům dle čl. 15 GDPR,</li>
            <li>
              právo na opravu osobních údajů dle čl. 16 GDPR (většinu údajů můžete opravit sami v sekci{" "}
              <Link to="/ucet" className="text-wood underline">Můj účet</Link>), popřípadě omezení zpracování dle
              čl. 18 GDPR,
            </li>
            <li>právo na výmaz osobních údajů dle čl. 17 GDPR,</li>
            <li>právo vznést námitku proti zpracování dle čl. 21 GDPR,</li>
            <li>právo na přenositelnost údajů dle čl. 20 GDPR.</li>
          </Ul>
          Svá práva můžete uplatnit e-mailem na adrese {mail}. Správce žádost vyřídí bez zbytečného odkladu, nejpozději
          do jednoho měsíce.
        </li>
        <li>
          Dále máte právo podat stížnost u Úřadu pro ochranu osobních údajů (<A href="https://uoou.gov.cz">uoou.gov.cz</A>)
          v případě, že se domníváte, že bylo porušeno Vaše právo na ochranu osobních údajů.
        </li>
      </Article>

      <Article no="VII" title="Podmínky zabezpečení osobních údajů">
        <li>Správce prohlašuje, že přijal vhodná technická a organizační opatření k zabezpečení osobních údajů.</li>
        <li>
          Správce přijal technická opatření k zabezpečení datových úložišť, zejména šifrovaný přenos dat (HTTPS),
          ukládání hesel pouze v podobě šifrovaného otisku, přístup k databázi chráněný heslem a oddělení neveřejných
          údajů (e-mail, telefon) od veřejně zobrazovaných.
        </li>
        <li>
          Správce prohlašuje, že k osobním údajům mají přístup pouze jím pověřené osoby; pořadatelé závodů mají přístup
          jen k přihláškám do svých závodů.
        </li>
        <li>
          Web nepoužívá cookies. Po přihlášení se v úložišti prohlížeče (localStorage) uloží přihlašovací token, který
          je nezbytný pro fungování přihlášení a smaže se odhlášením.
        </li>
      </Article>

      <Article no="VIII" title="Závěrečná ustanovení">
        <li>
          Vytvořením účtu potvrzujete, že jste se seznámil/a se zásadami ochrany osobních údajů.
        </li>
        <li>
          Správce je oprávněn tyto zásady změnit. Novou verzi zveřejní na této stránce, případně Vám ji zašle na
          e-mailovou adresu, kterou jste správci poskytl/a.
        </li>
      </Article>

      <p className="text-sm text-forest-700/70 text-center">Tyto zásady nabývají účinnosti dnem {EFFECTIVE_FROM}.</p>
    </div>
  );
}
