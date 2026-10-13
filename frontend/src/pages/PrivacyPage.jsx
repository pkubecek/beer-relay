import { Link } from "react-router-dom";
import { Card } from "../components/ui";

// ⚠️ Doplňte před zveřejněním: kdo je správce osobních údajů a kontakt na něj.
const CONTROLLER = "DOPLŇTE jméno správce (např. spolek nebo fyzická osoba)";
const CONTACT_EMAIL = "DOPLŇTE@kontakt.cz";
const EFFECTIVE_FROM = "13. 10. 2026";

function Section({ title, children }) {
  return (
    <section className="mb-8">
      <h2 className="font-display text-2xl font-bold uppercase mb-3">{title}</h2>
      <div className="space-y-3 text-sm leading-relaxed text-forest-900">{children}</div>
    </section>
  );
}

function Table({ head, rows }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b-2 border-forest-900 text-left font-display uppercase text-xs tracking-wide text-wood">
            {head.map((h) => <th key={h} className="py-2 pr-3">{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r[0]} className="border-b border-wood/15 align-top">
              {r.map((c, i) => <td key={i} className={`py-2 pr-3 ${i === 0 ? "font-semibold" : ""}`}>{c}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function PrivacyPage() {
  return (
    <div className="max-w-3xl">
      <h1 className="font-display text-4xl md:text-5xl font-extrabold uppercase tracking-tight mb-2">Ochrana osobních údajů</h1>
      <p className="text-sm text-forest-700/70 mb-8">Platné od {EFFECTIVE_FROM}</p>

      <Card className="p-5 mb-8 text-sm leading-relaxed">
        Pivní štafety zpracovávají jen údaje potřebné k vedení účtu, přihláškám na závody a zveřejnění výsledků.
        Nepoužíváme reklamu, analytické nástroje ani cookies. Váš e-mail a telefon nejsou nikde veřejně vidět.
      </Card>

      <Section title="1. Kdo údaje zpracovává">
        <p>
          Správcem osobních údajů je <strong>{CONTROLLER}</strong>, provozovatel webu Pivní štafety. S dotazy a
          žádostmi se obracejte na <a className="text-wood underline" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
        </p>
        <p>
          Za údaje k jednotlivým závodům odpovídá i jejich pořadatel: vidí přihlášky do svých závodů včetně kontaktu na
          kapitána týmu a používá je k organizaci závodu.
        </p>
      </Section>

      <Section title="2. Jaké údaje zpracováváme a proč">
        <Table
          head={["Údaje", "Účel", "Právní základ"]}
          rows={[
            ["E-mail, jméno, příjmení, heslo (uložené jen jako šifrovaný otisk)", "Vytvoření a vedení účtu, přihlášení", "Plnění smlouvy"],
            ["Ročník, oddíl, telefon (nepovinné)", "Předvyplnění přihlášek, kontakt pořadatele s kapitánem", "Plnění smlouvy"],
            ["Přihláška týmu: název, oddíl, kategorie, sestava po úsecích, poznámka", "Přihlášení na závod a jeho organizace", "Plnění smlouvy"],
            ["Pořadí, čas a DNF týmu", "Zveřejnění výsledků závodu", "Oprávněný zájem (sportovní tradice zveřejňovat výsledky)"],
            ["Žádost o roli pořadatele", "Vyřízení žádosti administrátorem", "Plnění smlouvy"],
            ["IP adresa a technické záznamy serveru", "Bezpečnost a řešení chyb", "Oprávněný zájem"],
          ]}
        />
        <p>
          <strong>Veřejně jsou vidět</strong> názvy týmů, oddíly, jména závodníků v sestavách, startovní čísla a výsledky.
          E-maily a telefony veřejně zobrazeny nejsou.
        </p>
      </Section>

      <Section title="3. Údaje, které za vás zadá kapitán">
        <p>
          Kapitán týmu při přihlášce vyplní jména členů sestavy a může uvést i jejich e-mail. E-mail slouží jen k tomu, aby
          člen viděl přihlášku ve svém účtu; veřejný není. Kapitán by měl členy týmu o přihlášce informovat. Pokud si
          nepřejete být v sestavě uvedeni, napište kapitánovi, pořadateli nebo nám.
        </p>
      </Section>

      <Section title="4. Komu údaje předáváme">
        <Table
          head={["Příjemce", "Proč", "Kde"]}
          rows={[
            ["Pořadatel závodu", "Organizace závodu, do kterého se přihlašujete", "–"],
            ["Railway Corporation", "Provoz serveru a databáze", "USA / EU"],
            ["Vercel Inc.", "Provoz webové stránky", "USA / EU"],
            ["OpenStreetMap Foundation", "Zobrazení mapy a hledání adres (vidí IP adresu)", "Velká Británie"],
            ["Google (Google Fonts)", "Načtení písma stránky (vidí IP adresu)", "USA"],
          ]}
        />
        <p>
          Předání mimo EU probíhá na základě standardních smluvních doložek Evropské komise, případně rámce EU-USA pro
          ochranu osobních údajů. Údaje neprodáváme ani nepoužíváme k reklamě.
        </p>
      </Section>

      <Section title="5. Jak dlouho údaje uchováváme">
        <p>
          Údaje účtu uchováváme, dokud účet existuje. Účet si můžete kdykoli smazat sami v sekci{" "}
          <Link to="/ucet" className="text-wood underline">Můj účet</Link>. Smazáním odstraníme e-mail, telefon a další
          údaje profilu a zrušíme vaše přihlášky na nadcházející závody. Přihlášky a výsledky proběhlých závodů zůstanou
          zachovány bez vazby na účet a bez kontaktních údajů, protože jsou součástí historie závodu. Zálohy databáze se
          přepisují nejpozději do 30 dnů.
        </p>
      </Section>

      <Section title="6. Cookies a úložiště v prohlížeči">
        <p>
          Nepoužíváme cookies. Po přihlášení si prohlížeč uloží do svého úložiště (localStorage) přihlašovací token, bez
          kterého by přihlášení nefungovalo. Jde o technicky nezbytné uložení, proto k němu nežádáme souhlas. Token se
          smaže odhlášením. Nepoužíváme žádné analytické ani reklamní nástroje.
        </p>
      </Section>

      <Section title="7. Vaše práva">
        <ul className="list-disc pl-5 space-y-1">
          <li>získat přístup ke svým údajům a jejich kopii,</li>
          <li>opravit je – většinu můžete změnit sami v sekci <Link to="/ucet" className="text-wood underline">Můj účet</Link>,</li>
          <li>smazat účet – sami v sekci Můj účet, nebo na požádání,</li>
          <li>požádat o omezení zpracování nebo vznést námitku proti zpracování na základě oprávněného zájmu,</li>
          <li>na přenositelnost údajů,</li>
          <li>
            podat stížnost u Úřadu pro ochranu osobních údajů (
            <a className="text-wood underline" href="https://uoou.gov.cz" target="_blank" rel="noreferrer">uoou.gov.cz</a>).
          </li>
        </ul>
        <p>
          Žádost pošlete na <a className="text-wood underline" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>; vyřídíme
          ji nejpozději do 30 dnů.
        </p>
      </Section>
    </div>
  );
}
