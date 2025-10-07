export interface LanguageContent {
  // Navigation & UI
  chats: string
  sendDirectMessage: string
  advancedUserSearch: string
  addUsersToConversation: string
  searchMessages: string
  searchConversations: string
  createNewConversation: string
  joinConversation: string
  
  // Messages & Chat
  typeMessage: string
  messagesEncrypted: string
  encrypted: string
  decrypt: string
  yourMessages: string
  sendPrivatePhotos: string
  sendMessage: string
  attachFile: string
  
  // Dialogs & Forms
  conversationName: string
  conversationPassword: string
  accessCode: string
  create: string
  join: string
  cancel: string
  send: string
  search: string
  
  // Notifications
  conversationCreated: string
  accessCodeCopied: string
  messageDecrypted: string
  failedToDecrypt: string
  directMessageSent: string
  userAdded: string
  usersAddedToConversation: string
  
  // Status & Time
  activeNow: string
  online: string
  offline: string
  away: string
  now: string
  
  // Errors
  enterAccessCode: string
  setPassword: string
  noUsersFound: string
  noConversationsYet: string
  startConversation: string
  
  // Security
  encryptingMessage: string
  encryptionDescription: string
  doNotClose: string
  secureConversation: string
  biometricRequired: string
  
  // Access Code Generation
  generateAccessCode: string
  accessCodeGenerated: string
  copyAccessCode: string
  shareAccessCode: string
  accessCodeInfo: string
  
  // Sign Up Form
  createNewAccount: string
  quickAndEasy: string
  firstName: string
  lastName: string
  username: string
  email: string
  newPassword: string
  signUp: string
  acceptTerms: string
  createPage: string
  alreadyHaveAccount: string
  signInHere: string
  usernameHelper: string
}

export const languages: Record<string, LanguageContent> = {
  en: {
    // Navigation & UI
    chats: "Chats",
    sendDirectMessage: "Send Direct Message",
    advancedUserSearch: "Advanced User Search", 
    addUsersToConversation: "Add Users to Conversation",
    searchMessages: "Search Messages",
    searchConversations: "Search conversations...",
    createNewConversation: "Create New Conversation",
    joinConversation: "Join Conversation",
    
    // Messages & Chat
    typeMessage: "Type a message...",
    messagesEncrypted: "Messages are end-to-end encrypted",
    encrypted: "Encrypted",
    decrypt: "Decrypt",
    yourMessages: "Your Messages",
    sendPrivatePhotos: "Send private photos and messages to a friend or group",
    sendMessage: "Send message",
    attachFile: "Attach File",
    
    // Dialogs & Forms
    conversationName: "Conversation Name (Optional)",
    conversationPassword: "Conversation Password",
    accessCode: "Access Code",
    create: "Create",
    join: "Join",
    cancel: "Cancel",
    send: "Send",
    search: "Search",
    
    // Notifications
    conversationCreated: "Conversation created! Access code:",
    accessCodeCopied: "Access code copied!",
    messageDecrypted: "Message decrypted successfully!",
    failedToDecrypt: "Failed to decrypt message",
    directMessageSent: "Direct message sent to",
    userAdded: "Added",
    usersAddedToConversation: "Added users to conversation:",
    
    // Status & Time
    activeNow: "Active now",
    online: "online",
    offline: "offline", 
    away: "away",
    now: "now",
    
    // Errors
    enterAccessCode: "Please enter an access code",
    setPassword: "Please set a password for this conversation",
    noUsersFound: "No users found",
    noConversationsYet: "No conversations yet",
    startConversation: "Start a conversation",
    
    // Security
    encryptingMessage: "Encrypting Message",
    encryptionDescription: "Your message is being secured with 2048-bit post-quantum cryptography. This process takes approximately 3 minutes to ensure maximum security.",
    doNotClose: "Do not close this window during encryption",
    secureConversation: "Secure Conversation Access", 
    biometricRequired: "This conversation requires biometric verification for enhanced security.",
    
    // Access Code Generation
    generateAccessCode: "Generate Access Code",
    accessCodeGenerated: "Access code generated successfully",
    copyAccessCode: "Copy Access Code",
    shareAccessCode: "Share Access Code",
    accessCodeInfo: "Share this code with others to let them join your conversation",
    
    // Sign Up Form
    createNewAccount: "Create a new account",
    quickAndEasy: "It's quick and easy.",
    firstName: "First name",
    lastName: "Last name",
    username: "Username",
    email: "Email",
    newPassword: "New password",
    signUp: "Sign Up",
    acceptTerms: "By clicking Sign Up, you agree to our Terms, Data Policy and Cookies Policy. You may receive SMS Notifications from us and can opt out any time.",
    createPage: "Create a Page for a celebrity, brand or business.",
    alreadyHaveAccount: "Already have an account?",
    signInHere: "Sign in here",
    usernameHelper: "Others will find you by this username to start conversations"
  },
  
  pl: {
    // Navigation & UI
    chats: "Czaty",
    sendDirectMessage: "Wyślij wiadomość bezpośrednią",
    advancedUserSearch: "Zaawansowane wyszukiwanie użytkowników",
    addUsersToConversation: "Dodaj użytkowników do konwersacji", 
    searchMessages: "Szukaj wiadomości",
    searchConversations: "Szukaj konwersacji...",
    createNewConversation: "Utwórz nową konwersację",
    joinConversation: "Dołącz do konwersacji",
    
    // Messages & Chat
    typeMessage: "Napisz wiadomość...",
    messagesEncrypted: "Wiadomości są szyfrowane end-to-end",
    encrypted: "Zaszyfrowane",
    decrypt: "Odszyfruj",
    yourMessages: "Twoje wiadomości",
    sendPrivatePhotos: "Wysyłaj prywatne zdjęcia i wiadomości do znajomego lub grupy",
    sendMessage: "Wyślij wiadomość",
    attachFile: "Dołącz plik",
    
    // Dialogs & Forms
    conversationName: "Nazwa konwersacji (opcjonalna)",
    conversationPassword: "Hasło konwersacji",
    accessCode: "Kod dostępu",
    create: "Utwórz",
    join: "Dołącz",
    cancel: "Anuluj",
    send: "Wyślij",
    search: "Szukaj",
    
    // Notifications
    conversationCreated: "Konwersacja utworzona! Kod dostępu:",
    accessCodeCopied: "Kod dostępu skopiowany!",
    messageDecrypted: "Wiadomość odszyfrowana pomyślnie!",
    failedToDecrypt: "Nie udało się odszyfrować wiadomości",
    directMessageSent: "Wiadomość bezpośrednia wysłana do",
    userAdded: "Dodano",
    usersAddedToConversation: "Dodano użytkowników do konwersacji:",
    
    // Status & Time
    activeNow: "Aktywny teraz",
    online: "online",
    offline: "offline",
    away: "nieobecny",
    now: "teraz",
    
    // Errors
    enterAccessCode: "Wprowadź kod dostępu",
    setPassword: "Ustaw hasło dla tej konwersacji",
    noUsersFound: "Nie znaleziono użytkowników",
    noConversationsYet: "Jeszcze brak konwersacji",
    startConversation: "Rozpocznij konwersację",
    
    // Security
    encryptingMessage: "Szyfrowanie wiadomości",
    encryptionDescription: "Twoja wiadomość jest zabezpieczana 2048-bitową kryptografią post-kwantową. Ten proces trwa około 3 minut aby zapewnić maksymalne bezpieczeństwo.",
    doNotClose: "Nie zamykaj tego okna podczas szyfrowania",
    secureConversation: "Dostęp do bezpiecznej konwersacji",
    biometricRequired: "Ta konwersacja wymaga weryfikacji biometrycznej dla zwiększenia bezpieczeństwa.",
    
    // Access Code Generation
    generateAccessCode: "Wygeneruj kod dostępu",
    accessCodeGenerated: "Kod dostępu został wygenerowany pomyślnie",
    copyAccessCode: "Kopiuj kod dostępu",
    shareAccessCode: "Udostępnij kod dostępu",
    accessCodeInfo: "Udostępnij ten kod innym, aby mogli dołączyć do konwersacji",
    
    // Sign Up Form
    createNewAccount: "Utwórz nowe konto",
    quickAndEasy: "To szybkie i łatwe.",
    firstName: "Imię",
    lastName: "Nazwisko",
    username: "Nazwa użytkownika",
    email: "Email",
    newPassword: "Nowe hasło",
    signUp: "Zarejestruj się",
    acceptTerms: "Klikając Zarejestruj się, wyrażasz zgodę na nasze Warunki, Politykę Danych i Politykę Plików Cookie. Możesz otrzymywać powiadomienia SMS od nas i w każdej chwili zrezygnować.",
    createPage: "Utwórz stronę dla gwiazdy, marki lub firmy.",
    alreadyHaveAccount: "Masz już konto?",
    signInHere: "Zaloguj się tutaj",
    usernameHelper: "Inni znajdą Cię po tej nazwie użytkownika, aby rozpocząć rozmowy"
  }
}

export type LanguageCode = keyof typeof languages