# Status Użytkowników - Instrukcja dla Użytkowników

## Co to jest status użytkownika?

Status użytkownika pokazuje, czy dana osoba jest aktualnie dostępna do rozmowy. W SecureChat Pro używamy trzech kolorów wskaźnika:

### 🟢 **Online (Zielony)** - Użytkownik jest aktywny
- Użytkownik jest zalogowany i aktywnie korzysta z aplikacji
- Porusza myszą, pisze wiadomości lub przegląda konwersacje
- Odpowie prawdopodobnie szybko

### 🟡 **Away (Żółty)** - Użytkownik jest z dala
- Użytkownik jest zalogowany, ale nie wykazuje aktywności przez ponad 5 minut
- Może być w innej karcie przeglądarki lub krótko odszedł od komputera
- Może nie odpowiedzieć natychmiast

### ⚪ **Offline (Szary)** - Użytkownik jest offline
- Użytkownik się wylogował lub zamknął aplikację
- Nie otrzyma wiadomości w czasie rzeczywistym
- Otrzyma powiadomienie mailowe (jeśli włączone)

---

## Gdzie widzę status innych użytkowników?

Status innych użytkowników jest widoczny w kilku miejscach:

### 1. **Lista konwersacji**
Przy każdej konwersacji bezpośredniej (1-na-1) widzisz kolorowy wskaźnik statusu obok awatara użytkownika.

### 2. **Lista uczestników (konwersacje grupowe)**
W konwersacjach grupowych możesz zobaczyć status każdego uczestnika na liście członków grupy.

### 3. **Wyszukiwanie użytkowników**
Gdy szukasz kogoś, aby rozpocząć rozmowę, status pomaga wybrać osoby, które są obecnie dostępne.

---

## Jak działa mój status?

### Automatyczna zmiana statusu

Twój status jest aktualizowany **automatycznie** na podstawie Twojej aktywności:

#### ✅ **Stajesz się Online gdy:**
- Logujesz się do aplikacji
- Poruszasz myszą
- Piszesz wiadomość
- Klikasz cokolwiek w aplikacji
- Przewijasz stronę
- Wracasz do karty z aplikacją

#### ⏰ **Stajesz się Away gdy:**
- Nie wykonujesz żadnych akcji przez **5 minut**
- Przejdziesz do innej karty przeglądarki (po 5 minutach)
- Zminimalizujesz okno przeglądarki (po 5 minutach)

#### 🔴 **Stajesz się Offline gdy:**
- Klikniesz przycisk "Log Out"
- Zamkniesz kartę z aplikacją
- Zamkniesz przeglądarkę
- Utracisz połączenie internetowe

---

## Prywatność

### Co inni widzą?

Inni użytkownicy widzą:
- ✅ Twój aktualny status (Online/Away/Offline)
- ✅ Czas ostatniej aktywności (tylko jeśli jesteś Offline)

Inni użytkownicy **NIE widzą**:
- ❌ Co dokładnie robisz w aplikacji
- ❌ Z kim rozmawiasz
- ❌ Treści Twoich wiadomości
- ❌ Czy czytasz konkretną konwersację

### Czy mogę ukryć swój status?

Obecnie system statusu jest automatyczny i nie można go wyłączyć, ponieważ:
1. Pomaga innym użytkownikom wiedzieć, kiedy możesz odpowiedzieć
2. Zwiększa efektywność komunikacji w zespole
3. Jest integralną częścią systemu powiadomień

W przyszłych wersjach możemy dodać opcję "Invisible" (niewidoczny), która pokaże Cię jako Offline nawet gdy jesteś aktywny.

---

## Często zadawane pytania

### ❓ Dlaczego mój status zmienia się na Away, gdy jestem aktywny?

Jeśli Twój status zmienia się na Away mimo że jesteś aktywny, może to oznaczać:
- Korzystasz z innej karty przeglądarki
- Czytasz wiadomości bez poruszania myszą przez długi czas
- Masz włączone jakieś rozszerzenie przeglądarki, które blokuje zdarzenia JavaScript

**Rozwiązanie:** Porusz myszą lub naciśnij dowolny klawisz, a status wróci do Online.

### ❓ Dlaczego inni widzą mnie jako Offline, gdy jestem zalogowany?

Jeśli inni widzą Cię jako Offline mimo że jesteś zalogowany:
1. Sprawdź połączenie internetowe
2. Odśwież stronę (F5)
3. Wyloguj się i zaloguj ponownie

Możliwe przyczyny:
- Chwilowa utrata połączenia z internetem
- Problem z serwerem Realtime
- Przeglądarka zablokowała WebSocket

### ❓ Co oznacza "Last seen 5 minutes ago"?

To informacja pokazująca, kiedy użytkownik był ostatnio aktywny w aplikacji. Jest widoczna tylko gdy użytkownik ma status Offline.

Przykłady:
- "Last seen just now" - mniej niż 1 minuta temu
- "Last seen 15 minutes ago" - 15 minut temu
- "Last seen 2 hours ago" - 2 godziny temu
- "Last seen yesterday" - wczoraj

### ❓ Czy status wpływa na otrzymywanie wiadomości?

**Nie!** Status NIE wpływa na dostarczanie wiadomości.

- ✅ Wiadomości są zawsze dostarczane, niezależnie od statusu
- ✅ Wiadomości są zawsze szyfrowane i przechowywane bezpiecznie
- ✅ Zobaczysz wszystkie wiadomości po zalogowaniu

Status pokazuje tylko dostępność użytkownika do **natychmiastowej rozmowy**.

### ❓ Jak długo trwa aktualizacja statusu?

Status jest aktualizowany **w czasie rzeczywistym**:
- Zmiana z Online na Away: automatycznie po 5 minutach braku aktywności
- Zmiana z Away na Online: natychmiast po jakiejkolwiek aktywności
- Zmiana na Offline: natychmiast po wylogowaniu/zamknięciu aplikacji

Inne osoby zobaczą zmianę Twojego statusu w ciągu **1-2 sekund**.

---

## Wskazówki dla efektywnej komunikacji

### 📨 Wysyłanie wiadomości

- **🟢 Online** → Wyślij wiadomość, użytkownik prawdopodobnie odpowie szybko
- **🟡 Away** → Możesz wysłać wiadomość, ale odpowiedź może zająć trochę czasu
- **⚪ Offline** → Wyślij wiadomość, użytkownik zobaczy ją po zalogowaniu (dostanie powiadomienie mailowe, jeśli włączone)

### 👥 Konwersacje grupowe

W konwersacjach grupowych możesz zobaczyć status wszystkich uczestników:
- Kliknij ikonę "Members" lub "Participants"
- Status każdego uczestnika jest wyświetlany obok jego nazwy
- Możesz sortować według statusu (Online → Away → Offline)

### 🔔 Powiadomienia

System dostosowuje powiadomienia do statusu:
- **Online** → Powiadomienie dźwiękowe w aplikacji
- **Away** → Powiadomienie dźwiękowe + powiadomienie systemowe (desktop)
- **Offline** → Powiadomienie mailowe (jeśli włączone w ustawieniach)

---

## Przykłady użycia

### Przykład 1: Pilna wiadomość
```
Musisz wysłać pilną wiadomość do kolegi z pracy.

1. Otwórz listę kontaktów
2. Sprawdź status:
   - 🟢 Online → Wyślij natychmiast, odpowiedź w kilka sekund
   - 🟡 Away → Wyślij i zadzwoń dodatkowo
   - ⚪ Offline → Użyj innego kanału komunikacji (telefon, SMS)
```

### Przykład 2: Planowanie spotkania
```
Chcesz szybko ustalić termin spotkania z zespołem.

1. Otwórz konwersację grupową
2. Kliknij "Members"
3. Zobacz ile osób jest Online
4. Jeśli większość jest 🟢 Online → pisz teraz
5. Jeśli większość jest 🟡 Away lub ⚪ Offline → poczekaj lub wyślij zaproszenie kalendarzowe
```

### Przykład 3: Czas odpowiedzi
```
Wysłałeś wiadomość, ale nie dostałeś odpowiedzi.

Sprawdź status odbiorcy:
- 🟢 Online → Czeka kilka minut (5-10 min)
- 🟡 Away → Może być zajęty, poczekaj 30-60 minut
- ⚪ Offline → Odpowiedź może przyjść za kilka godzin
```

---

## Rozwiązywanie problemów

### Problem: Mój status nie zmienia się

**Krok 1:** Odśwież stronę (F5)  
**Krok 2:** Sprawdź połączenie internetowe  
**Krok 3:** Wyloguj się i zaloguj ponownie  
**Krok 4:** Wyczyść cache przeglądarki  

### Problem: Status innych nie aktualizuje się

**Krok 1:** Odśwież stronę (F5)  
**Krok 2:** Poczekaj 30 sekund (system aktualizuje się co 30 sekund)  
**Krok 3:** Sprawdź czy przeglądarka ma włączone WebSocket  

### Problem: Status zawsze pokazuje Offline

**Krok 1:** Sprawdź czy masz włączoną blokadę reklam/tracking, która może blokować WebSocket  
**Krok 2:** Sprawdź firewall/antywirus  
**Krok 3:** Spróbuj użyć innej przeglądarki  

---

## Wsparcie techniczne

Jeśli masz problemy z systemem statusu, które nie zostały rozwiązane powyższymi krokami:

📧 Email: support@securechat.pro  
💬 Live Chat: Kliknij ikonę "Help" w prawym dolnym rogu  
📞 Telefon: +48 XXX XXX XXX (pon-pt 9:00-17:00)  

---

**Ostatnia aktualizacja dokumentacji:** 2025-10-07  
**Wersja systemu:** 2.0
