# Changelog

## [1.3.0] – 2026-06-26

### Hinzugefügt
- **Mahlzeiten**: Mehrere Zutaten zu einer benannten Mahlzeit kombinieren und dauerhaft speichern (neue Tabellen `meals` / `meal_ingredients`). Zutaten per Suche oder manuell hinzufügen, Mengen je Zutat anpassbar, Live-Gesamtsumme.
- **Portionsweise hinzufügen**: Gespeicherte Mahlzeiten mit Faktor zum Tagebuch eintragen (Presets 1× / ½ / ⅓ / ¼ / 0,2× oder eigener Faktor) – ideal für Meal-Prep über mehrere Tage.
- **„Zuletzt"-Segment** im Hinzufügen-Tab: die letzten 100 verwendeten Lebensmittel (offline aus SQLite), antippen zum erneuten Eintragen mit übernommener Menge.
- **Monatsansicht** (neuer Tab 📅): Kalender mit grünen (Ziel eingehalten), gelben (überschritten) und grauen (nichts getrackt) Tagen, Monatsstatistik, Tippen springt zum Tag.
- **Animationen & Haptik**: animierter Kalorienring & Makrobalken, Einblenden neuer Karten, Press-Effekt am „+", haptisches Feedback bei Hinzufügen/Speichern/Löschen.
- **Vorausplanung**: zukünftige Tage (bis 1 Jahr) im Heute-Tab eintragbar.

### Geändert
- Hinzufügen-Tab in Segmente gegliedert: Suche · Scanner · Zuletzt · Mahlzeiten · Manuell (Standard jetzt „Suche").

### Behoben
- **Produktsuche** auf den neuen Dienst `search.openfoodfacts.org` umgestellt (alter `cgi/search.pl` lieferte 503) – funktioniert zuverlässig beim ersten Versuch; robustes `fetch` mit Timeout & Retry.
- **Race Condition** bei der DB-Initialisierung behoben (`UNIQUE constraint failed: user_goals.id`) – Init als einmaliges Promise gecacht, `INSERT OR IGNORE`.
- Untere Tab-Leiste respektiert jetzt die Android-Navigationsleiste (Safe-Area-Inset).

## [1.2.0] – 2026-06-26

### Geändert
- **App umbenannt von „MacroMind" in „Tracc"** (App-Name, Slug, Paketname, lokale Datenbank `tracc.db`).

### Hinzugefügt
- **Eintrag bearbeiten**: Nach rechts wischen → grüner „Bearbeiten"-Button öffnet einen Dialog zum Anpassen der Menge. Alle Nährwerte werden proportional neu berechnet.
- **7-Tage-Trend** im Gewicht-Tab: zeigt die Veränderung gegenüber dem ältesten Eintrag der letzten 7 Tage (↑/↓ kg).
- **Bedienhinweise** im Einstellungen-Tab (Swipe-Gesten & Antippen erklärt).

## [1.1.0] – 2026-06-26

### Hinzugefügt
- **Datums-Navigation** im Heute-Tab: vergangene Tage per Pfeil ‹ › ansehen und bearbeiten, „Zu heute springen"-Verknüpfung.
- **Echtes Swipe-to-Delete** auf Einträgen (links wischen → roter Löschen-Button) — ersetzt den bisherigen Long-Press. Erfüllt die ursprüngliche Spezifikation.
- **Restkalorien-Anzeige** unter dem Kalorien-Ring („Noch X kcal übrig" / „X kcal über dem Ziel").
- **Kalorien pro Mahlzeit** in jeder Sektions-Überschrift.

### Geändert
- Hinzufügen von Lebensmitteln respektiert jetzt das im Heute-Tab gewählte Datum (nicht mehr immer „heute").

### Behoben
- Robuste Farb-/Fortschrittsberechnung in `KcalRing` und `MacroBar`, wenn ein Ziel auf 0 steht (kein NaN mehr).

## [1.0.0]

- Erstveröffentlichung: 4-Tab-App (Heute / Hinzufügen / Gewicht / Einstellungen),
  SQLite-Speicher, Open-Food-Facts-Barcodescanner & -Suche, Gewichtsverlauf,
  editierbare Tagesziele, Dark-Mode-Design.
