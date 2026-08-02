import LegalLayout from "../LegalLayout";

export default function ImprintPage() {
  return (
    <LegalLayout title="Impressum">
      <h2>Angaben gemäß § 5 Digitale-Dienste-Gesetz (DDG) und § 18 Medienstaatsvertrag (MStV)</h2>
      <p>
        Lavr Anichin<br />
        Hornschuchpromenade 43<br />
        90762, Fürth<br />
        Deutschland
      </p>

      <h2>Kontakt</h2>
      <p>
        E-Mail: <span className="lp-fill">contact@explorescenicroutes.com</span>
      </p>

      <h2>Verbraucherstreitbeilegung</h2>
      <p>
        Wir sind weder verpflichtet noch bereit, an Streitbeilegungsverfahren vor einer
        Verbraucherschlichtungsstelle teilzunehmen.
      </p>
    </LegalLayout>
  );
}
