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
