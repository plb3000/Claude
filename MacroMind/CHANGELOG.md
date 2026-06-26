# Changelog

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
