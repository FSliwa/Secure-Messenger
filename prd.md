# SecureChat Pro - Product Requirements Document

Bezpieczna platforma komunikacji z obsługą języka polskiego oferująca zaawansowane funkcje wyszukiwania i komunikacji bezpośredniej.

**Experience Qualities**:
1. **Bezpieczeństwo** - Szyfrowanie end-to-end wszystkich komunikatów z wykorzystaniem post-quantum cryptography
2. **Intuicyjność** - Facebook-podobny interfejs z polskim interfejsem użytkownika i płynną nawigacją
3. **Elastyczność** - Możliwość komunikacji bezpośredniej, grupowej i zarządzania uczestnikami konwersacji

**Complexity Level**: Light Application (multiple features with basic state)
- Obsługa wielu trybów komunikacji z zachowaniem prostoty użytkowania dla polskojęzycznych użytkowników

## Essential Features

### 1. Wiadomości Bezpośrednie (Direct Messages)
- **Functionality**: Możliwość wysłania wiadomości do użytkownika bez tworzenia formalnej konwersacji
- **Purpose**: Szybka komunikacja jednokierunkowa bez zobowiązań do długoterminowej konwersacji
- **Trigger**: Niebieska ikona koperty w głównym menu czatów
- **Progression**: Kliknij ikonę koperty → Wyszukaj użytkownika → Wybierz odbiorcę → Napisz wiadomość → Wyślij
- **Success criteria**: Wiadomość zostaje dostarczona do odbiorcy z potwierdzeniem wysłania w języku polskim

### 2. Zaawansowane Wyszukiwanie Użytkowników
- **Functionality**: Wyszukiwanie użytkowników po nazwie użytkownika (@nazwa) lub nazwie wyświetlanej w czasie rzeczywistym
- **Purpose**: Ułatwienie znajdowania konkretnych osób w systemie z obsługą polskich znaków
- **Trigger**: Zielona ikona użytkownika w głównym menu
- **Progression**: Kliknij ikonę użytkownika → Wpisz nazwę → Przeglądaj wyniki w czasie rzeczywistym → Wybierz akcję (chat/dodaj)
- **Success criteria**: System znajduje użytkowników z dokładnością >95% i obsługuje polskie znaki diakrytyczne

### 3. Dodawanie Użytkowników do Konwersacji
- **Functionality**: Możliwość dodawania nowych uczestników do istniejących konwersacji grupowych
- **Purpose**: Rozszerzanie zespołów i grup roboczych bez konieczności tworzenia nowych konwersacji
- **Trigger**: Fioletowa ikona grupy (widoczna tylko podczas aktywnej konwersacji)
- **Progression**: Wybierz konwersację → Kliknij ikonę grupy → Wyszukaj użytkowników → Zaznacz multiple → Dodaj do konwersacji
- **Success criteria**: Nowi uczestnicy otrzymują dostęp do przyszłych wiadomości z informacją o ograniczeniach bezpieczeństwa

### 4. Zaszyfrowane Konwersacje Grupowe
- **Functionality**: Tworzenie i zarządzanie konwersacjami z kodami dostępu
- **Purpose**: Bezpieczna komunikacja zespołowa z kontrolą dostępu
- **Trigger**: Przycisk "+" w głównym menu
- **Progression**: Kliknij "+" → Wprowadź nazwę konwersacji → Ustaw hasło → Otrzymaj kod dostępu → Udostępnij kod
- **Success criteria**: Konwersacja jest tworzona z unikalnym kodem dostępu i szyfrowaniem 2048-bit

## Edge Case Handling

- **Użytkownik nie znaleziony**: Wyświetlanie komunikatu "Brak wyników" z sugestiami alternatywnych sposobów wyszukiwania
- **Błąd sieci podczas wyszukiwania**: Komunikat o błędzie połączenia z możliwością ponownej próby
- **Dodawanie użytkownika już w konwersacji**: Sprawdzanie duplikatów z informacją zwrotną
- **Przekroczenie limitu uczestników**: Komunikat o maksymalnej liczbie uczestników w konwersacji
- **Bezpieczeństwo wiadomości bezpośrednich**: Informowanie o poziomie szyfrowania w zależności od typu wiadomości

## Design Direction

Interfejs powinien emanować poczuciem bezpieczeństwa i profesjonalizmu, zachowując jednocześnie znajomość i łatwość użytkowania znaną z platform społecznościowych. Design ma być czysty i minimalistyczny z akcjami kolorami dla różnych typów komunikacji.

## Color Selection

Complementary (opposite colors) - różne kolory dla różnych typów akcji komunikacyjnych

- **Primary Color**: Facebook Blue (oklch(0.45 0.15 250)) - Główne akcje i branding, komunikuje zaufanie i stabilność
- **Secondary Colors**: 
  - Blue accent (oklch(0.5 0.12 240)) - Wiadomości bezpośrednie (koperta)
  - Green accent (oklch(0.48 0.12 145)) - Wyszukiwanie użytkowników
  - Purple accent (oklch(0.5 0.15 270)) - Zarządzanie grupami
- **Accent Color**: Warm Orange (oklch(0.65 0.15 45)) - Powiadomienia i ważne akcje
- **Foreground/Background Pairings**:
  - Background (oklch(0.97 0.005 220)): Dark text (oklch(0.15 0.02 240)) - Ratio 11.2:1 ✓
  - Primary Blue (oklch(0.45 0.15 250)): White text (oklch(0.98 0.01 240)) - Ratio 8.1:1 ✓
  - Cards (oklch(1.0 0 0)): Dark text (oklch(0.15 0.02 240)) - Ratio 15.8:1 ✓

## Font Selection

Czcionki powinny być czytelne i przyjazne dla polskich znaków diakrytycznych, z naciskiem na profesjonalizm i nowoczesność.

- **Typographic Hierarchy**:
  - H1 (Główne nagłówki): Inter Bold/24px/tight letter spacing
  - H2 (Nazwy konwersacji): Inter SemiBold/18px/normal spacing  
  - Body (Wiadomości): Inter Regular/14px/relaxed line height 1.5
  - Captions (Status, czas): Inter Medium/12px/normal spacing
  - Buttons (Akcje): Inter SemiBold/14px/tight spacing

## Animations

Animacje są subtelne i funkcjonalne, wspomagając użytkownika w nawigacji bez rozpraszania uwagi od głównych zadań komunikacyjnych.

- **Purposeful Meaning**: Micro-interactions podkreślają akcje bezpieczeństwa (ikona tarczy przy szyfrowaniu) i sukcesy (checkmark przy wysłaniu)
- **Hierarchy of Movement**: 
  - Wysoka: Powiadomienia o nowych wiadomościach i błędach
  - Średnia: Przejścia między dialog boxes i hover states na przyciskach
  - Niska: Subtle loading states i focus indicators

## Component Selection

- **Components**: 
  - Dialog (shadcn) - dla wszystkich okien modalnych wyszukiwania i dodawania użytkowników
  - Card (shadcn) - dla wyników wyszukiwania użytkowników z customowymi hover states
  - Badge (shadcn) - dla statusu online/offline użytkowników z polskimi oznaczeniami
  - ScrollArea (shadcn) - dla list konwersacji i wyników wyszukiwania
  - Input (shadcn) - z customowym stylingiem Facebook dla wyszukiwania
- **Customizations**: 
  - PolishUserSearchCard - komponenty wyszukiwania z obsługą polskich znaków
  - DirectMessageComposer - dedykowany composer dla wiadomości bezpośrednich
  - ConversationParticipantManager - zarządzanie uczestnikami z polski UI
- **States**: 
  - Search inputs mają 4 stany: empty, typing, loading, results/no-results
  - User cards: normal, hover, selected (dla multiple selection)
  - Direct message button: disabled (brak odbiorcy), enabled, sending
- **Icon Selection**: 
  - EnvelopeSimple - wiadomości bezpośrednie
  - MagnifyingGlass + User - zaawansowane wyszukiwanie
  - Users - zarządzanie grupami
  - Shield - oznaczenia bezpieczeństwa
- **Spacing**: Consistent 4px grid z większymi odstępami (16px) między sekcjami funkcjonalności
- **Mobile**: 
  - Responsive design z priorytetem dla mobile-first
  - Touch-friendly targets (44px minimum) dla wszystkich interaktywnych elementów
  - Collapsible sidebar dla konwersacji na małych ekranach
  - Simplified UI z drawer navigation dla zaawansowanych funkcji