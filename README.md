# Kuchnia Metodyczna — strona www

Statyczna strona (HTML/CSS/JS, bez frameworków) z trzema podstronami:

- `index.html` — strona główna / Podcast
- `o-nas.html` — O nas
- `szkolenia.html` — Szkolenia

## Edycja
Treść, nawigacja i ikony są w `build.py`. Po zmianach uruchom:

```
python3 build.py
```

Style: `css/style.css`. Zdjęcia: `img/`. Fonty są hostowane lokalnie w `fonts/`.

Linki do YouTube i Instagrama ustaw w `build.py` (zmienne `YOUTUBE`, `INSTAGRAM`).

## Podgląd lokalny
```
python3 -m http.server 8080
```
i otwórz http://localhost:8080

## Newsletter

- Strony: `regulamin-newslettera.html`, `polityka-prywatnosci.html`, `potwierdz.html` (potwierdzenie zapisu), `wypisz.html` (wypis).
- Formularz zapisu: sekcja na stronie głównej + stopka na każdej stronie. Jest ukryty, dopóki `js/config.js` nie zawiera adresu aplikacji Google Apps Script.
- Backend: `apps-script/Code.gs` (Google Sheet + Gmail na koncie kuchniametodyczna@gmail.com). Instrukcja: `apps-script/INSTRUKCJA.md`.
- Po zmianie Regulaminu/Polityki: zaktualizuj tekst i `REG_VERSION` / `POL_VERSION` w `build.py` oraz w `js/newsletter.js`, potem `python3 build.py`.
