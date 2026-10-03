#!/usr/bin/env python3
"""Builds the static pages (index.html, o-nas.html, szkolenia.html).

Header, footer and icons live here once; run `python3 build.py` after edits.
The generated .html files are plain static pages — no build step is needed to host them.
"""
from pathlib import Path

ROOT = Path(__file__).parent

# --- Links (update YouTube / Instagram when you have them) -------------------
SPOTIFY = "https://open.spotify.com/show/78JCaoAEl9yniNS0A4y9NV"
YOUTUBE = "#"    # TODO: link to YouTube channel
INSTAGRAM = "#"  # TODO: link to Instagram profile

# --- Icons -------------------------------------------------------------------
def ico(body, vb="0 0 24 24"):
    return f'<svg class="ico" viewBox="{vb}" aria-hidden="true">{body}</svg>'

I = {
    "mic": ico('<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0 0 14 0M12 17v4M8 21h8"/>'),
    "users": ico('<circle cx="12" cy="8" r="3.2"/><circle cx="5.3" cy="9.6" r="2.3"/><circle cx="18.7" cy="9.6" r="2.3"/>'
                 '<path d="M6.5 19c0-3.2 2.5-5.6 5.5-5.6s5.5 2.4 5.5 5.6zM1.5 18c0-2.5 1.7-4.3 4-4.3M22.5 18c0-2.5-1.7-4.3-4-4.3"/>'),
    "cap": ico('<path d="M2 9.5 12 5l10 4.5-10 4.5z"/><path d="M6 11.5V16c0 1.4 2.7 3 6 3s6-1.6 6-3v-4.5M22 9.5V15"/>'),
    "bulb": ico('<path d="M9.5 18h5M10.5 21h3M12 6a5 5 0 0 0-3 9c.5.4.8 1 .8 1.6h4.4c0-.6.3-1.2.8-1.6a5 5 0 0 0-3-9z"/>'
                '<path class="accent" d="M12 1.5v1.5M4.5 4.5l1 1M19.5 4.5l-1 1M2 11h1.5M20.5 11H22"/>'),
    "monitor": ico('<rect x="2" y="4" width="20" height="13" rx="2"/><path d="M8 21h8M12 17v4"/>'),
    "robot": ico('<rect x="4" y="8" width="16" height="12" rx="3"/><path d="M12 8V4.5M9.5 4h5M2 12.5v3.5M22 12.5v3.5M9.5 16.5h5"/>'
                 '<circle class="fill" cx="9" cy="12.5" r="1.4"/><circle class="fill" cx="15" cy="12.5" r="1.4"/>'),
    "brain": ico('<path d="M12 5.5A3 3 0 0 0 6.6 4 3 3 0 0 0 4 8.2a3.2 3.2 0 0 0-.6 5.3A3.4 3.4 0 0 0 7.5 18.6 2.9 2.9 0 0 0 12 19.5z"/>'
                 '<path d="M12 5.5A3 3 0 0 1 17.4 4 3 3 0 0 1 20 8.2a3.2 3.2 0 0 1 .6 5.3 3.4 3.4 0 0 1-4.1 5.1 2.9 2.9 0 0 1-4.5.9z"/>'
                 '<path d="M12 5.5v14M7.5 9.5c1 0 2 .6 2 1.8M16.5 9.5c-1 0-2 .6-2 1.8M7.5 14.5h2M14.5 14.5h2"/>'),
    "pencil": ico('<path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4z"/><path d="M14.5 5.5l3 3"/>'),
    "board": ico('<rect x="3" y="4" width="18" height="11" rx="1"/><path d="M2 4h20M12 15v3M8.5 21l3.5-3 3.5 3"/>'
                 '<path class="accent" d="M7 12l3-3 2 2 4-4"/>'),
    "chat": ico('<path d="M14 9.5c0 2.8-2.7 5-6 5-.9 0-1.7-.1-2.4-.4L2.5 15.5l1-2.8A4.6 4.6 0 0 1 2 9.5c0-2.8 2.7-5 6-5s6 2.2 6 5z"/>'
                '<path d="M16.6 8.2c3 .4 5.4 2.5 5.4 5 0 1.2-.5 2.3-1.4 3.2l1 2.8-3.2-1.4c-.7.3-1.5.4-2.4.4-2.2 0-4.1-1-5.1-2.4"/>'),
    "group": ico('<circle cx="7" cy="6.5" r="2.4"/><circle cx="17" cy="6.5" r="2.4"/><circle cx="12" cy="11.5" r="2.6"/>'
                 '<path d="M2.5 14.5c0-2 2-3.6 4.5-3.6M21.5 14.5c0-2-2-3.6-4.5-3.6M6.8 20.5c0-2.9 2.3-5.2 5.2-5.2s5.2 2.3 5.2 5.2z"/>'),
    "sprout": ico('<path d="M12 21v-8.5"/><path d="M12 12.5c0-4.2 3.1-7.5 8.5-7.5 0 4.2-3.1 7.5-8.5 7.5z"/>'
                  '<path d="M12 14.5c0-3.4-2.6-6.5-7.5-6.5 0 3.6 2.6 6.5 7.5 6.5z"/>'),
    "dice": ico('<path d="M12 2.5 20.5 7v10L12 21.5 3.5 17V7z"/><path d="M3.5 7 12 11.5 20.5 7M12 11.5v10"/>'
                '<circle class="fill" cx="12" cy="7" r="1.1"/><circle class="fill" cx="7" cy="12" r="1"/><circle class="fill" cx="8.5" cy="16" r="1"/>'
                '<circle class="fill" cx="15" cy="13" r="1"/><circle class="fill" cx="17.5" cy="16.5" r="1"/>'),
    "laptop": ico('<rect x="14" y="10" width="72" height="46" rx="4" transform="rotate(-8 50 33)"/>'
                  '<path d="M6 66l84-12 8 10-86 12z"/><path d="M24 64l52-7M30 70l40-5.5" />'
                  '<circle class="accent-fill" cx="48" cy="30" r="12"/><path d="M44 42h8M45 46h6M48 18v-6M34 24l-5-3M62 23l5-4"/>',
                  "0 0 100 80"),
}
PLAY = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 3.5v17L20 12z"/></svg>'
CHEVRON = '<svg viewBox="0 0 34 20" aria-hidden="true"><path d="M3 3l14 13L31 3" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
CHEVRON_SM = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 6l5 5 5-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'

BURST = '<svg class="burst{cls}" viewBox="0 0 80 80" aria-hidden="true" style="{style}"><path d="M14 46 30 12M34 58 66 30M42 72h30"/></svg>'
def burst(cls="", style=""):
    return BURST.format(cls=(" " + cls) if cls else "", style=style)

LOGO = ('<svg viewBox="0 0 100 100" aria-hidden="true">'
        '<circle cx="50" cy="50" r="50" fill="#f7a823"/>'
        '<path fill="#fff" d="M35 16c-7 9-9 26-4 37l3 3v28a3.3 3.3 0 0 0 6.6 0V21c0-4-3.7-7.6-5.6-5z"/>'
        '<path fill="none" stroke="#fff" stroke-width="3.4" stroke-linecap="round" d="M52 18v18M58.5 18v18M65 18v18"/>'
        '<path fill="#fff" d="M50 33h17v5a8.5 8.5 0 0 1-17 0z"/><rect fill="#fff" x="55.3" y="44" width="6.4" height="43" rx="3.2"/>'
        '</svg>')

SOCIAL = f'''<div class="socials">
  <a href="{YOUTUBE}" aria-label="YouTube" target="_blank" rel="noopener"><svg viewBox="0 0 28 28"><rect x="1" y="5" width="26" height="18" rx="5" fill="#1b1b1a"/><path d="M11.5 9.5v9l7.5-4.5z" fill="#fff"/></svg></a>
  <a href="{SPOTIFY}" aria-label="Spotify" target="_blank" rel="noopener"><svg viewBox="0 0 28 28"><circle cx="14" cy="14" r="13" fill="#1b1b1a"/><path d="M7 10.5c4.8-1.5 10-1 14 1.3M8 14.4c4-1.1 8.2-.7 11.4 1.1M8.8 18c3.2-.8 6.4-.5 9 .9" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round"/></svg></a>
  <a href="{INSTAGRAM}" aria-label="Instagram" target="_blank" rel="noopener"><svg viewBox="0 0 28 28"><rect x="2.5" y="2.5" width="23" height="23" rx="7" fill="none" stroke="#1b1b1a" stroke-width="2.6"/><circle cx="14" cy="14" r="5.2" fill="none" stroke="#1b1b1a" stroke-width="2.6"/><circle cx="20.6" cy="7.4" r="1.6" fill="#1b1b1a"/></svg></a>
</div>'''

CUR = ' aria-current="page"'
NAV = [("index.html", "Podcast"), ("o-nas.html", "O nas"), ("szkolenia.html", "Szkolenia")]

def header(active):
    links = "\n    ".join(
        f'<a href="{h}"{CUR if h == active else ""}>{t.upper()}</a>' for h, t in NAV)
    return f'''<header class="site-header">
  <div class="wrap">
    <a class="brand" href="index.html" aria-label="Kuchnia Metodyczna — strona główna">
      {LOGO}
      <span class="brand-text"><b>KUCHNIA</b><span>METODYCZNA</span></span>
    </a>
    <nav class="main-nav" aria-label="Główna nawigacja">
    {links}
    </nav>
    {SOCIAL}
    <button class="menu-toggle" aria-label="Menu" aria-expanded="false"><span></span><span></span><span></span></button>
  </div>
</header>'''

def footer():
    links = " ".join(f'<a href="{h}">{t.upper()}</a>' for h, t in NAV)
    return f'''<footer class="site-footer">
  <div class="wrap">
    <a class="brand" href="index.html">{LOGO}<span class="brand-text"><b>KUCHNIA</b><span>METODYCZNA</span></span></a>
    <nav aria-label="Stopka">{links}</nav>
    <small>© <span id="year">2026</span> Kuchnia Metodyczna · Justyna Deczewska &amp; Magdalena Ziółek-Wojnar</small>
  </div>
</footer>'''

def page(filename, title, description, body):
    html = f'''<!doctype html>
<html lang="pl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title}</title>
<meta name="description" content="{description}">
<meta property="og:title" content="{title}">
<meta property="og:description" content="{description}">
<meta property="og:image" content="img/hero.webp">
<meta name="theme-color" content="#f7a823">
<link rel="icon" href="img/favicon.svg" type="image/svg+xml">
<link rel="preload" href="fonts/anton-latin-400-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="css/fonts.css">
<link rel="stylesheet" href="css/style.css">
</head>
<body>
{header(filename)}
<main>
{body}
</main>
{footer()}
<script src="js/main.js" defer></script>
</body>
</html>
'''
    (ROOT / filename).write_text(html, encoding="utf-8")

# ============================ HOME ===========================================
features = [
    ("index.html#podcast", "mic", "Podcast", "Inspirujące rozmowy<br>o nauczaniu języków."),
    ("o-nas.html", "users", "O nas", "Dwie nauczycielki,<br>jedna wspólna pasja."),
    ("szkolenia.html", "cap", "Szkolenia", "Praktyczna wiedza<br>dla nauczycieli."),
]
feat_items = "\n".join(
    f'      <li><a href="{h}"><div class="icon-circle">{I[i]}</div><h3>{t.upper()}</h3><p>{d}</p></a></li>'
    for h, i, t, d in features)
tiles = "\n".join(
    f'      <a class="tile" href="{h}">{I[i]}<span>{t.upper()}</span></a>' for h, i, t, _ in features)

home = f'''<section class="hero" id="podcast">
  <div class="dots" style="left:-30px;top:40px;width:180px;height:260px"></div>
  <div class="dots" style="left:-20px;bottom:120px;width:240px;height:200px"></div>
  <div class="wrap">
    <div class="hero-text">
      {burst()}
      <h1 class="display"><span class="accent">Kuchnia</span><span class="ink">Metodyczna</span></h1>
      <p class="lead">Tu łączymy doświadczenie, wiedzę i&nbsp;praktykę, żeby tworzyć lepsze lekcje językowe.</p>
      <a class="btn" href="{SPOTIFY}" target="_blank" rel="noopener">{PLAY}SŁUCHAJ PODCASTU</a>
    </div>
    <div class="hero-photo">
      <img src="img/hero.webp" width="1528" height="1272" alt="Justyna Deczewska i Magdalena Ziółek-Wojnar w koszulkach z logo Kuchni Metodycznej">
    </div>
  </div>
  <svg class="wave" viewBox="0 0 1440 110" preserveAspectRatio="none" aria-hidden="true">
    <path d="M0 70C260 20 520 10 760 40s460 60 680 0V110H0z"/>
    <path class="line" d="M0 74C240 24 470 16 640 26"/>
  </svg>
</section>

<section class="features">
  <div class="dots" style="right:0;top:0;width:160px;height:160px"></div>
  <div class="wrap">
    <h2 class="sr-only">Co znajdziesz w Kuchni Metodycznej</h2>
    <ul>
{feat_items}
    </ul>
    <div class="tiles">
{tiles}
    </div>
    <a class="scroll-cue" href="o-nas.html" aria-label="Poznaj nas">{CHEVRON}</a>
  </div>
</section>'''

page("index.html", "Kuchnia Metodyczna — podcast o nauczaniu języków",
     "Kuchnia Metodyczna: podcast i szkolenia dla nauczycieli języków obcych. Doświadczenie, wiedza i praktyka dla lepszych lekcji językowych.",
     home)

# ============================ SZKOLENIA ======================================
topics = [
    ("robot", "Tworzenie materiałów dydaktycznych z wykorzystaniem narzędzi AI",
     "Jak korzystać z AI przy projektowaniu lekcji, ćwiczeń, tekstów, zadań komunikacyjnych i materiałów dopasowanych do poziomu grupy."),
    ("brain", "Wyzwania teraźniejszości: jak rozwijać krytyczne myślenie na lekcji języka obcego",
     "Jak projektować zadania, które uczą nie tylko języka, ale też analizy informacji, argumentowania, interpretowania i zadawania dobrych pytań."),
    ("pencil", "Kreatywność na lekcji języka: od prostego ćwiczenia do twórczego działania",
     "Jak rozwijać kreatywność uczniów bez chaosu, infantylizacji i aktywności robionych „dla ozdoby”."),
    ("board", "Prezentacje, których chce się słuchać",
     "Jak przygotowywać i prowadzić prezentacje edukacyjne, szkoleniowe i konferencyjne, które są jasne, angażujące i dobrze zapamiętywane."),
    ("chat", "Jak uruchomić grupę, która milczy",
     "Praktyczne techniki rozwijania mówienia, budowania bezpieczeństwa komunikacyjnego i angażowania uczniów w rozmowę."),
    ("group", "Grupy zróżnicowane poziomem: jak uczyć, kiedy wszyscy są „gdzie indziej”",
     "Jak planować lekcje, różnicować zadania i organizować pracę w grupach o nierównym poziomie zaawansowania."),
    ("sprout", "Pracuj mniej, ale lepiej: dobrostan i organizacja pracy nauczyciela",
     "Jak odzyskać kontrolę nad przygotowaniem zajęć, materiałami, poprawianiem prac i własną energią zawodową."),
    ("dice", "Grywalizacja z sensem: jak projektować questy, gry i escape roomy językowe",
     "Jak tworzyć angażujące aktywności językowe oparte na fabule, zagadkach, współpracy i rozwiązywaniu problemów."),
]
topic_html = "\n".join(
    f'''      <article class="topic">
        <div class="topic-head"><span class="num">{n}</span><div class="icon-circle">{I[i]}</div><h3>{t}</h3></div>
        <p>{d}</p>
      </article>''' for n, (i, t, d) in enumerate(topics, 1))
topic_html += f'''
      <article class="topic wide">
        <div class="topic-head"><span class="num">9</span><div class="icon-circle">{I["mic"]}</div></div>
        <div><h3>Od podcastu do praktyki: warsztat wokół wybranego tematu Kuchni Metodycznej</h3>
        <p>Szkolenie przygotowane na podstawie wybranego odcinka podcastu i dostosowane do potrzeb konkretnego zespołu.</p></div>
      </article>'''

formats = f'''<div class="format"><div class="icon-circle">{I["monitor"]}</div><div><b>Szkolenia online</b><span>Wygodna forma<br>dla Twojego zespołu.</span></div></div>
        <div class="format"><div class="icon-circle">{I["users"]}</div><div><b>Warsztaty stacjonarne</b><span>Spotykamy się<br>w całej Polsce.</span></div></div>'''

szk = f'''<section class="page-hero">
  <div class="dots" style="left:-30px;top:30px;width:120px;height:300px"></div>
  <div class="dots" style="left:40%;top:-20px;width:240px;height:140px"></div>
  <div class="wrap">
    <div class="sz-text">
      {burst()}
      <h1 class="display"><span class="accent">Szkolenia</span><span class="ink">Kuchni Metodycznej</span></h1>
      <p>Kuchnia Metodyczna to nie tylko podcast. <mark>Prowadzimy również autorskie szkolenia</mark> dla szkół, szkół językowych, uczelni, zespołów lektorskich, ośrodków doskonalenia nauczycieli oraz innych instytucji edukacyjnych.</p>
      <div class="formats">
        {formats}
      </div>
    </div>
    <div class="sz-photo">
      <img src="img/szkolenia.webp" width="980" height="916" alt="Justyna Deczewska i Magdalena Ziółek-Wojnar">
      <div class="sticky-note">Praktyczna wiedza dla nauczycieli języków obcych.</div>
      <div class="laptop">{I["laptop"]}</div>
    </div>
    <div class="formats formats-mobile">
      {formats}
    </div>
  </div>
</section>

<section class="topics" id="tematy">
  <div class="dots" style="right:-20px;top:40px;width:140px;height:240px"></div>
  <div class="wrap">
    <h2 class="section-title">Przykładowe tematy <span class="accent">szkoleń</span>{burst()}</h2>
    <div class="topic-grid">
{topic_html}
    </div>
  </div>
</section>'''

page("szkolenia.html", "Szkolenia — Kuchnia Metodyczna",
     "Autorskie szkolenia Kuchni Metodycznej dla szkół, szkół językowych, uczelni, zespołów lektorskich i ośrodków doskonalenia nauczycieli.",
     szk)

# ============================ O NAS ==========================================
justyna = [
    "Od lat uczę dorosłych – na uczelni, w szkołach językowych, w firmach i na kursach indywidualnych. Jestem współautorką podręczników językowych dla dorosłych i dla uczniów szkół średnich. Podczas zajęć stawiam na <mark>dobrą atmosferę, aktywność i autentyczną komunikację.</mark> Chciałabym, żeby z moich lekcji wychodziło się nie tylko z nowymi słówkami, ale też z uśmiechem i odrobinę większą wiarą we własne możliwości. Wierzę, że na dobrej lekcji uczą się wszyscy – także nauczyciel.",
    "Lubię szukać prostych i nieszablonowych sposobów na to, żeby <mark>język naprawdę „zadziałał” poza salą lekcyjną.</mark> Cenię zadania, które angażują, budzą ciekawość i dają poczucie, że języka można używać od pierwszych chwil, nawet jeśli nie wszystko jeszcze potrafimy powiedzieć. W nauczaniu najbardziej fascynuje mnie możliwość wejścia na chwilę w świat drugiego człowieka – i spotkania się tam poprzez język.",
]
magdalena = [
    "Od ponad 20 lat uczę języka rosyjskiego – przede wszystkim studentów i dorosłych – i nadal naprawdę uwielbiam to robić. Jestem lektorką, egzaminatorką i autorką egzaminów. <mark>Praca z ludźmi daje mi energię,</mark> a inspiracji do zajęć szukam właściwie wszędzie: w podróżach, rozmowach i codziennym życiu.",
    "Od wielu lat prowadzę szkolenia dla nauczycieli. W dydaktyce lubię eksperymentować, pracować metodą projektów i sprawdzać, co naprawdę działa w sali lekcyjnej. <mark>Fascynuje mnie AI i możliwości,</mark> jakie otwiera przed edukacją.",
    "Sama też bardzo lubię być po drugiej stronie – uczyć się, uczestniczyć w konferencjach i wyjazdach Erasmus+, poznawać nauczycieli z innych krajów i przyglądać się ich pracy. Chętnie inicjuję międzynarodową współpracę i nawiązuję kontakty, z których często rodzą się kolejne pomysły i projekty.",
    "Poza salą lekcyjną trudno mi usiedzieć w miejscu. Podróżuję, gotuję, jeżdżę na rowerze i ciągle coś wymyślam. I chyba właśnie z tej <mark>ciekawości świata</mark> najczęściej biorą się moje pomysły na kolejne zajęcia, szkolenia i projekty.",
]

def bio(pid, paras):
    ps = f'<p class="first">{paras[0]}</p>' + "".join(f'<p class="more">{p}</p>' for p in paras[1:])
    return f'''<div class="bio collapsed" id="{pid}">{ps}</div>
        <button class="bio-toggle" aria-controls="{pid}" aria-expanded="false"><span>Czytaj więcej</span>{CHEVRON_SM}</button>'''

onas = f'''<section class="about">
  <div class="dots" style="left:-20px;top:120px;width:200px;height:260px"></div>
  <div class="dots" style="right:-20px;top:180px;width:180px;height:300px"></div>
  <div class="dots" style="left:30%;top:640px;width:200px;height:200px"></div>
  <div class="wrap">
    <div class="about-head">
      <h1 class="display">O nas{burst()}</h1>
      <div class="note">Dwie nauczycielki, jedna wspólna pasja.</div>
    </div>

    <article class="person">
      <div class="person-photo"><img src="img/justyna.webp" width="844" height="876" alt="Justyna Deczewska" loading="lazy"></div>
      <div>
        <div class="person-name"><h2 class="display"><span class="accent">Justyna</span><span class="ink">Deczewska</span></h2>{burst()}</div>
        {bio("bio-justyna", justyna)}
      </div>
    </article>

    <div class="divider-swoosh" aria-hidden="true"><svg viewBox="0 0 1200 40" preserveAspectRatio="none"><path d="M0 34C300 0 700 0 1200 20"/></svg></div>

    <article class="person reverse">
      <div class="person-photo"><img src="img/magdalena.webp" width="882" height="894" alt="Magdalena Ziółek-Wojnar" loading="lazy"></div>
      <div>
        <div class="person-name"><h2 class="display"><span class="accent">Magdalena</span><span class="ink">Ziółek-Wojnar</span></h2>{burst()}</div>
        {bio("bio-magdalena", magdalena)}
      </div>
    </article>
  </div>
</section>'''

page("o-nas.html", "O nas — Kuchnia Metodyczna",
     "Justyna Deczewska i Magdalena Ziółek-Wojnar — dwie nauczycielki języków obcych, jedna wspólna pasja.",
     onas)

# favicon
(ROOT / "img" / "favicon.svg").write_text(LOGO.replace(' aria-hidden="true"', ' xmlns="http://www.w3.org/2000/svg"'), encoding="utf-8")
print("Built index.html, o-nas.html, szkolenia.html")
