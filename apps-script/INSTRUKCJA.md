# Newsletter Kuchni Metodycznej — uruchomienie (ok. 15 minut)

Wszystko robimy **na koncie kuchniametodyczna@gmail.com** (zaloguj się na nie w przeglądarce, najlepiej jako jedyne konto albo w osobnym oknie/profilu).

## 1. Arkusz

1. Wejdź na <https://sheets.new> — powstanie nowy arkusz Google.
2. Nazwij go np. **Kuchnia Metodyczna – newsletter** (kliknij „Arkusz bez tytułu” w lewym górnym rogu).

## 2. Skrypt

1. W arkuszu: menu **Rozszerzenia → Apps Script**. Otworzy się edytor kodu.
2. Usuń wszystko, co jest w pliku `Kod.gs` (`Code.gs`), i wklej całą zawartość pliku **Code.gs** z tego folderu.
3. Kliknij ikonę dyskietki (**Zapisz**).
4. Po lewej przy **Usługi** kliknij **+**, wybierz **Gmail API** i kliknij **Dodaj**.
   (Dzięki temu Gmail u odbiorców pokaże własny przycisk „Anuluj subskrypcję”.)

## 3. Konfiguracja i uprawnienia

1. Na górnym pasku wybierz z listy funkcję **skonfiguruj** i kliknij **Uruchom**.
2. Google poprosi o uprawnienia: **Sprawdź uprawnienia** → wybierz konto kuchniametodyczna@gmail.com.
3. Pojawi się ostrzeżenie „Google nie zweryfikował tej aplikacji” — to normalne dla własnych skryptów.
   Kliknij **Zaawansowane** → **Przejdź do projektu (niebezpieczne)** → **Zezwól**.
4. Wróć do arkusza i odśwież stronę. Pojawią się karty **Subskrybenci**, **Wiadomość**, **Dziennik** oraz menu **Newsletter**.

## 4. Wdrożenie (adres dla strony)

1. W edytorze Apps Script: **Wdróż → Nowe wdrożenie**.
2. Kliknij koło zębate obok „Wybierz typ” → **Aplikacja internetowa**.
3. Ustaw:
   - Opis: `newsletter`
   - **Wykonaj jako: Ja (kuchniametodyczna@gmail.com)**
   - **Kto ma dostęp: Każdy**
4. **Wdróż** → skopiuj **adres URL aplikacji internetowej** (kończy się na `/exec`).
5. Wyślij ten adres Dimie — wpisze go w pliku `js/config.js` na stronie. Od tej chwili formularze na stronie staną się widoczne.

> Po każdej zmianie kodu: **Wdróż → Zarządzaj wdrożeniami → ołówek → Wersja: Nowa wersja → Wdróż**. Adres `/exec` pozostaje ten sam.

## 5. Test

1. Na stronie kuchniametodyczna.pl zapisz swój prywatny adres. W arkuszu pojawi się wiersz ze statusem **oczekuje**.
2. Kliknij link w mailu „Potwierdź zapis…” → status **aktywny**, a na kuchniametodyczna@gmail.com przyjdzie powiadomienie „Nowy subskrybent”.
3. W karcie **Wiadomość** wpisz temat i treść → menu **Newsletter → Wyślij test**.
4. W mailu testowym sprawdź wygląd. (Link „Wypisz się” w teście nie działa — w prawdziwej wysyłce każdy dostaje własny.)

## Na co dzień

| Co | Jak |
|---|---|
| Nowe zapisy | Powiadomienie na Gmailu + wiersz w karcie **Subskrybenci** |
| Wysłanie newslettera | Karta **Wiadomość**: temat (B1), treść (B2; pusta linia = nowy akapit, linki działają same) → **Newsletter → Wyślij test** → **Newsletter → Wyślij newsletter (nowa wysyłka)** |
| Więcej niż ~90 osób | Skrypt wysyła maks. 90 wiadomości dziennie (limit darmowego Gmaila). Następnego dnia: **Newsletter → Dokończ przerwaną wysyłkę** |
| Wypisy | Automatycznie: link w stopce, przycisk Gmaila lub strona kuchniametodyczna.pl/wypisz.html → status **wypisany** + powiadomienie |
| Ktoś prosi mailem o wypis | Wpisz w jego wierszu status `wypisany` i datę w kolumnie „Data wypisu” |
| Ktoś prosi o usunięcie danych (RODO) | Usuń cały wiersz (prawy klik → Usuń wiersz) |
| Porządki | **Newsletter → Usuń niepotwierdzone zapisy** (starsze niż 30 dni) |
| Liczby | **Newsletter → Pokaż podsumowanie** |

**Nie zmieniaj** nazw kart ani kolejności kolumn. Ukryte kolumny L–M (tokeny) są potrzebne do linków potwierdzania i wypisu.

Zmiana Regulaminu lub Polityki prywatności: daj znać Dimie — zaktualizuje tekst na stronie i numer wersji (zapisywany przy każdej zgodzie).
