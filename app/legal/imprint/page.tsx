import LegalLayout from "../LegalLayout";

export default function ImprintPage() {
  return (
    <LegalLayout title="Impressum" updated="November 2026">
      <h2>Angaben gemäß § 5 Digitale-Dienste-Gesetz (DDG)</h2>
      <p>
        Lavr Anichin<br />
        Explore Scenic Routes<br />
        Hornschuchpromenade 43<br />
        90762 Fürth<br />
        Deutschland
      </p>

      <h2>Kontakt</h2>
      <p>
        E-Mail: <span className="lp-fill">contact@explorescenicroutes.com</span>
        <br />
        Telefon: <span className="lp-fill">[Telefonnummer eintragen – oder Zeile durch Kontaktformular ersetzen]</span>
      </p>

      <h2>Verantwortlich für den Inhalt nach § 18 Abs. 2 Medienstaatsvertrag (MStV)</h2>
      <p>
        Lavr Anichin<br />
        Hornschuchpromenade 43<br />
        90762 Fürth<br />
        Deutschland
      </p>

      {/* Nur einfügen, falls eine Umsatzsteuer-Identifikationsnummer vorhanden ist:
      <h2>Umsatzsteuer-Identifikationsnummer</h2>
      <p>Umsatzsteuer-Identifikationsnummer gemäß § 27a Umsatzsteuergesetz: DE…</p>
      */}

      <h2>Verbraucherstreitbeilegung</h2>
      <p>
        Wir sind weder bereit noch verpflichtet, an Streitbeilegungsverfahren vor einer
        Verbraucherschlichtungsstelle teilzunehmen.
      </p>

      <h2>Haftung für Inhalte</h2>
      <p>
        Die Inhalte dieser Website werden mit größtmöglicher Sorgfalt erstellt. Routenbeschreibungen,
        Entfernungen, Fahrzeiten und sonstige Reiseinformationen dienen jedoch ausschließlich der allgemeinen
        Information; Straßenverhältnisse, Sperrungen und Verkehrsregelungen können sich jederzeit ändern.
        Für die Richtigkeit, Vollständigkeit und Aktualität dieser Angaben können wir daher keine Gewähr
        übernehmen. Die gesetzliche Haftung, insbesondere nach Maßgabe unserer Nutzungsbedingungen, bleibt
        unberührt.
      </p>

      <h2>Haftung für Links</h2>
      <p>
        Unsere Website enthält Links zu externen Websites Dritter, auf deren Inhalte wir keinen Einfluss
        haben. Für diese Inhalte ist stets der jeweilige Anbieter oder Betreiber verantwortlich. Zum Zeitpunkt
        der Verlinkung waren keine Rechtsverstöße erkennbar. Werden uns Rechtsverletzungen bekannt, entfernen
        wir die betreffenden Links unverzüglich.
      </p>

      <h2>Urheberrecht</h2>
      <p>
        Die auf dieser Website veröffentlichten Texte, Grafiken, Illustrationen und das Design unterliegen dem
        deutschen Urheberrecht. Vervielfältigung, Bearbeitung, Verbreitung und jede Art der Verwertung
        außerhalb der Grenzen des Urheberrechts bedürfen der vorherigen schriftlichen Zustimmung des
        Rechteinhabers. Inhalte Dritter sind als solche gekennzeichnet bzw. werden mit deren Erlaubnis
        verwendet. Sollten Sie dennoch auf eine Urheberrechtsverletzung aufmerksam werden, bitten wir um einen
        entsprechenden Hinweis.
      </p>

      <h2>Bildnachweise</h2>
      <p>
        Landschafts- und Routenfotos stammen, soweit nicht anders angegeben, von{" "}
        <span className="lp-fill">Pexels (pexels.com) sowie aus eigenen Aufnahmen</span>. Logo,
        Illustrationen und Avatare sind eigene Werke von Explore Scenic Routes.
      </p>
    </LegalLayout>
  );
}