# Deutsch Drill – studie-app Duits 5 HAVO

Een oefen-app voor de telefoon, met dagmissies, flashcards, grammatica, leesteksten, spelletjes, streaks en beloningen.
De app draait gratis op GitHub Pages. Alle leerstof staat in gewone tekstbestanden die je zelf kunt aanvullen.

## Online zetten (eenmalig, ca. 10 minuten)

1. Maak een (gratis) account op github.com.
2. Klik rechtsboven op **+ → New repository**. Naam bijvoorbeeld `duits-5havo`. Kies **Public** en klik **Create repository**.
3. Klik op **uploading an existing file** en sleep alle bestanden en mappen uit deze zip erin. Klik **Commit changes**.
4. Ga naar **Settings → Pages**. Kies bij *Branch* `main` en `/ (root)` en klik **Save**.
5. Na 1–2 minuten staat de app op `https://<jouw-gebruikersnaam>.github.io/duits-5havo/`.
6. Open die link op de telefoon en kies **Zet op beginscherm** (iPhone: deel-knop; Android: menu ⋮). Dan werkt hij als een app, ook offline.

Let op: een publieke repository is voor iedereen leesbaar. Zet er dus geen privégegevens in.

## Leerstof toevoegen

Alles staat in de map `content/`. Na het aanpassen op GitHub (potloodje → wijzigen → *Commit changes*) staat het binnen een minuut in de app.

| Wat | Bestand | Formaat |
| --- | --- | --- |
| Welke stof bij welk tentamen hoort | `content/tentamens.json` | lijst met bestandsnamen (zonder .csv/.json) |
| Woordenlijsten | `content/woorden/<naam>.csv` | kolommen: `duits,nederlands,lidwoord,meervoud,voorbeeldzin` |
| Uitdrukkingen | `content/idiomen/<naam>.csv` | kolommen: `duits,nederlands,voorbeeldzin` |
| Grammatica | `content/grammatica/<naam>.json` | uitleg + vragen (type `gat` of `zinsbouw`) |
| Leesteksten | `content/lezen/<naam>.json` | alinea's + vragen (type `mc` of `open`) |
| Examentips | `content/examentips.json` | titel + tekst |
| Schrijfvaardigheid | `content/schrijven/<naam>.json` | uitleg, briefbouw, conventies, minizinnen en schrijfopdrachten met modelbrief |
| Beloningen en dagdoel | `beloningen.json` | mijlpalen met beloning |

Een CSV kun je openen en bewerken in Excel (opslaan als *CSV UTF-8*). Komma's in de laatste kolom (voorbeeldzin) mogen gewoon.
Een nieuw bestand telt pas mee als je de naam ook in `content/tentamens.json` bij een tentamen zet.

### Soorten mijlpalen in `beloningen.json`

| type | betekent | velden |
| --- | --- | --- |
| `streak` | aantal dagen achter elkaar de dagmissie gehaald | `waarde` |
| `beheersing` | percentage van het gekozen tentamen beheerst | `waarde` (optioneel `tentamen`) |
| `tentamenklaar` | beheersing én eindtoets-score (en optioneel aantal brieven) | `beheersing`, `toets`, `brieven` |
| `alles` | percentage van álle stof beheerst | `waarde` |

## Hoe de app leert

- **Gespreide herhaling:** elk item zit in een bakje 1–5. Goed = later terug (1, 2, 4, 8, 16 dagen), fout = morgen weer.
- **Beheerst** = bakje 4 of hoger, dus meerdere keren goed op verschillende dagen. Stampen op één avond telt niet.
- **Moeilijker naarmate hij het beter kent:** eerst flashcard, dan meerkeuze, dan zelf typen.
- **Streak-schild:** één gemiste dag per week breekt de streak niet.

## Schrijven op de laptop

Schrijfopdrachten kunnen op elk apparaat, maar typen gaat makkelijker op een laptop. Na het nakijken krijgt hij:

1. een automatische check van de vorm (datum, aanhef, komma, Sie, slotgroet, lengte);
2. een knop **Kopieer voor AI-feedback**: zijn brief plus beoordelingsinstructie, om te plakken in Claude of ChatGPT;
3. een **code**. Die voert hij op zijn telefoon in (Oefenen → Code van laptop invoeren), zodat de XP en de brief meetellen voor zijn mijlpalen. Elke code werkt één keer.

## Testen als ouder

Onder **Profiel → Voor ouders: testen** kun je een dag vooruit springen (streaks en herhalingen testen) en alles wissen.
De voortgang staat alleen op het apparaat waarop geoefend wordt.
