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
  decrypting: string
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

  // Login Form
  signInToAccount: string
  password: string
  signIn: string
  forgotPassword: string
  
  // Dashboard & General UI
  loadingSecureChat: string
  redirectingToLogin: string
  logout: string
  settings: string
  profile: string
  security: string
  privacy: string
  dashboard: string
  accessDenied: string
  mustBeLoggedIn: string
  returnToLogin: string
  securityInit: string
  enhancedSecurityInitialization: string
  signingOut: string
  loggedOutSuccessfully: string
  logoutFailed: string
  profileUpdatedSuccessfully: string
  secureChatMessenger: string
  facebookStyleInterface: string
  
  // Database
  initializingDatabase: string
  databaseInitialized: string
  databaseError: string
  
  // Common Actions
  save: string
  delete: string
  edit: string
  close: string
  back: string
  next: string 
  finish: string
  
  // Profile Settings
  profileSettings: string
  displayName: string
  bio: string
  status: string
  profileVisibility: string
  privacySettings: string
  notificationSettings: string
  lastSeenVisibility: string
  readReceipts: string
  typingIndicators: string
  messages: string
  groupInvites: string
  friendRequests: string
  securityAlerts: string
  public: string
  friends: string
  private: string
  usernameAvailable: string
  usernameNotAvailable: string
  checkingUsername: string
  failedToLoadProfile: string
  profileSaved: string
  failedToSaveProfile: string
  changeAvatar: string
  uploading: string
  selectImageFile: string
  fileSizeLimit: string
  failedToUploadAvatar: string
  usernameNotAvailableError: string
  profileUpdated: string
  failedToUpdateProfile: string
  customizeProfileSettings: string
  profilePicture: string
  changePhoto: string
  maxFileSize: string
  basicInformation: string
  enterUsername: string
  usernameAlreadyTaken: string
  failedToCreateConversation: string
  startedConversation: string
  copyCode: string
  failedToStartConversation: string
  successfullyJoinedConversation: string
  failedToJoinConversation: string
  
  // Security Features
  biometricAuth: string
  twoFactorAuth: string
  trustedDevices: string
  
  // Hero Section
  secureChatTitle: string
  secureChatSubtitle: string
  getStarted: string
  
  // Voice Messages
  voiceRecordingNotSupported: string
  voiceMessageRecorded: string
  recordingFailed: string
  playbackFailed: string
  microphonePermissionDenied: string
  recordingStarted: string
  microphoneAccessRequired: string
  requestPermission: string
  recordingPaused: string
  recording: string
  tapToStartRecording: string
  maxDuration: string
  voiceMessage: string
  failedToLoadVoiceMessage: string
  
  // Hero section features
  postQuantumEncryption: string
  threeMinuteSecurityProcess: string
  commercialGradePlatform: string
  enterpriseGradeSecurity: string
  advancedPostQuantumEncryptionDescription: string
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
    decrypting: "Decrypting...",
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
    usernameHelper: "Others will find you by this username to start conversations",

    // Login Form
    signInToAccount: "Sign in to your account",
    password: "Password",
    signIn: "Sign In",
    forgotPassword: "Forgot password?",
    
    // Dashboard & General UI
    loadingSecureChat: "Loading SecureChat...",
    redirectingToLogin: "Redirecting to login...",
    logout: "Logout",
    settings: "Settings",
    profile: "Profile",
    security: "Security",
    privacy: "Privacy",
    dashboard: "Dashboard",
    accessDenied: "Access Denied",
    mustBeLoggedIn: "You must be logged in to access the dashboard.",
    returnToLogin: "Return to Login",
    securityInit: "Security Init",
    enhancedSecurityInitialization: "Enhanced Security Initialization",
    signingOut: "Signing out...",
    loggedOutSuccessfully: "Logged out successfully",
    logoutFailed: "Logout failed, but you will be redirected",
    profileUpdatedSuccessfully: "Profile updated successfully",
    secureChatMessenger: "SecureChat Messenger",
    facebookStyleInterface: "Facebook-style interface with military-grade encryption",
    
    // Database
    initializingDatabase: "Initializing database...",
    databaseInitialized: "Database initialized successfully",
    databaseError: "Database initialization error",
    
    // Common Actions
    save: "Save",
    delete: "Delete",
    edit: "Edit",
    close: "Close",
    back: "Back",
    next: "Next",
    finish: "Finish",
    
    // Profile Settings
    profileSettings: "Profile Settings",
    displayName: "Display Name",
    bio: "Bio",
    status: "Status",
    profileVisibility: "Profile Visibility",
    privacySettings: "Privacy Settings",
    notificationSettings: "Notification Settings",
    lastSeenVisibility: "Last Seen Visibility",
    readReceipts: "Read Receipts",
    typingIndicators: "Typing Indicators",
    messages: "Messages",
    groupInvites: "Group Invites",
    friendRequests: "Friend Requests",
    securityAlerts: "Security Alerts",
    public: "Public",
    friends: "Friends",
    private: "Private",
    usernameAvailable: "Username is available",
    usernameNotAvailable: "Username is not available",
    checkingUsername: "Checking username...",
    failedToLoadProfile: "Failed to load profile settings",
    profileSaved: "Profile saved successfully",
    failedToSaveProfile: "Failed to save profile",
    changeAvatar: "Change Avatar",
    uploading: "Uploading...",
    selectImageFile: "Please select an image file",
    fileSizeLimit: "File size must be less than 5MB",
    failedToUploadAvatar: "Failed to upload avatar",
    usernameNotAvailableError: "Username is not available",
    profileUpdated: "Profile updated successfully",
    failedToUpdateProfile: "Failed to update profile",
    customizeProfileSettings: "Customize your profile and privacy settings",
    profilePicture: "Profile Picture",
    changePhoto: "Change Photo",
    maxFileSize: "Max 5MB, JPG/PNG only",
    basicInformation: "Basic Information",
    enterUsername: "Enter username",
    usernameAlreadyTaken: "Username is already taken",
    failedToCreateConversation: "Failed to create conversation",
    startedConversation: "Started conversation! Share access code",
    copyCode: "Copy Code",
    failedToStartConversation: "Failed to start conversation",
    successfullyJoinedConversation: "Successfully joined conversation!",
    failedToJoinConversation: "Failed to join conversation",
    
    // Security Features
    biometricAuth: "Biometric Authentication",
    twoFactorAuth: "Two-Factor Authentication",
    trustedDevices: "Trusted Devices",
    
    // Hero Section
    secureChatTitle: "Secure Messaging for Everyone",
    secureChatSubtitle: "End-to-end encrypted conversations with post-quantum cryptography",
    getStarted: "Get Started",
    
    // Voice Messages
    voiceRecordingNotSupported: "Voice recording is not supported in this browser",
    voiceMessageRecorded: "Voice message recorded successfully",
    recordingFailed: "Failed to record voice message",
    playbackFailed: "Failed to play voice message",
    microphonePermissionDenied: "Microphone permission denied",
    recordingStarted: "Recording started",
    microphoneAccessRequired: "Microphone Access Required",
    requestPermission: "Request Permission",
    recordingPaused: "Recording Paused",
    recording: "Recording",
    tapToStartRecording: "Tap to start recording",
    maxDuration: "Max duration",
    voiceMessage: "Voice Message",
    failedToLoadVoiceMessage: "Failed to load voice message",
    
    // Hero section features
    postQuantumEncryption: "Post-quantum encryption",
    threeMinuteSecurityProcess: "3-minute security process",
    commercialGradePlatform: "Commercial-grade platform",
    enterpriseGradeSecurity: "Enterprise-Grade Security",
    advancedPostQuantumEncryptionDescription: "Advanced post-quantum encryption with Signal Double Ratchet protocol."
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
    decrypting: "Odszyfrowywanie...",
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
    usernameHelper: "Inni znajdą Cię po tej nazwie użytkownika, aby rozpocząć rozmowy",

    // Login Form
    signInToAccount: "Zaloguj się do swojego konta",
    password: "Hasło",
    signIn: "Zaloguj się",
    forgotPassword: "Zapomniałeś hasła?",
    
    // Dashboard & General UI
    loadingSecureChat: "Ładowanie SecureChat...",
    redirectingToLogin: "Przekierowanie do logowania...",
    logout: "Wyloguj",
    settings: "Ustawienia",
    profile: "Profil",
    security: "Bezpieczeństwo",
    privacy: "Prywatność",
    dashboard: "Panel",
    accessDenied: "Dostęp zabroniony",
    mustBeLoggedIn: "Musisz być zalogowany, aby uzyskać dostęp do panelu.",
    returnToLogin: "Powrót do logowania",
    securityInit: "Inicjalizacja zabezpieczeń",
    enhancedSecurityInitialization: "Inicjalizacja zaawansowanych zabezpieczeń",
    signingOut: "Wylogowywanie...",
    loggedOutSuccessfully: "Wylogowano pomyślnie",
    logoutFailed: "Wylogowanie nie powiodło się, ale nastąpi przekierowanie",
    profileUpdatedSuccessfully: "Profil zaktualizowany pomyślnie",
    secureChatMessenger: "SecureChat Messenger",
    facebookStyleInterface: "Interfejs w stylu Facebooka z szyfrowaniem wojskowym",
    
    // Database
    initializingDatabase: "Inicjalizacja bazy danych...",
    databaseInitialized: "Baza danych zainicjalizowana pomyślnie",
    databaseError: "Błąd inicjalizacji bazy danych",
    
    // Common Actions
    save: "Zapisz",
    delete: "Usuń",
    edit: "Edytuj",
    close: "Zamknij",
    back: "Wstecz",
    next: "Dalej",
    finish: "Zakończ",
    
    // Profile Settings
    profileSettings: "Ustawienia profilu",
    displayName: "Nazwa wyświetlana",
    bio: "Opis",
    status: "Status",
    profileVisibility: "Widoczność profilu",
    privacySettings: "Ustawienia prywatności",
    notificationSettings: "Ustawienia powiadomień",
    lastSeenVisibility: "Widoczność ostatniej aktywności",
    readReceipts: "Potwierdzenia odczytu",
    typingIndicators: "Wskaźniki pisania",
    messages: "Wiadomości",
    groupInvites: "Zaproszenia do grup",
    friendRequests: "Prośby o znajomość",
    securityAlerts: "Alerty bezpieczeństwa",
    public: "Publiczny",
    friends: "Znajomi",
    private: "Prywatny",
    usernameAvailable: "Nazwa użytkownika jest dostępna",
    usernameNotAvailable: "Nazwa użytkownika nie jest dostępna",
    checkingUsername: "Sprawdzanie nazwy użytkownika...",
    failedToLoadProfile: "Nie udało się załadować ustawień profilu",
    profileSaved: "Profil zapisany pomyślnie",
    failedToSaveProfile: "Nie udało się zapisać profilu",
    changeAvatar: "Zmień awatar",
    uploading: "Przesyłanie...",
    selectImageFile: "Wybierz plik obrazu",
    fileSizeLimit: "Rozmiar pliku musi być mniejszy niż 5MB",
    failedToUploadAvatar: "Nie udało się przesłać awatara",
    usernameNotAvailableError: "Nazwa użytkownika nie jest dostępna",
    profileUpdated: "Profil zaktualizowany pomyślnie",  
    failedToUpdateProfile: "Nie udało się zaktualizować profilu",
    customizeProfileSettings: "Dostosuj swój profil i ustawienia prywatności",
    profilePicture: "Zdjęcie profilowe", 
    changePhoto: "Zmień zdjęcie",
    maxFileSize: "Maks. 5MB, tylko JPG/PNG",
    basicInformation: "Podstawowe informacje",
    enterUsername: "Wprowadź nazwę użytkownika",
    usernameAlreadyTaken: "Nazwa użytkownika jest już zajęta",
    failedToCreateConversation: "Nie udało się utworzyć konwersacji", 
    startedConversation: "Rozpoczęto konwersację! Udostępnij kod dostępu",
    copyCode: "Kopiuj kod",
    failedToStartConversation: "Nie udało się rozpocząć konwersacji",
    successfullyJoinedConversation: "Pomyślnie dołączono do konwersacji!",
    failedToJoinConversation: "Nie udało się dołączyć do konwersacji",
    
    // Security Features
    biometricAuth: "Uwierzytelnienie biometryczne",
    twoFactorAuth: "Uwierzytelnienie dwuskładnikowe",
    trustedDevices: "Zaufane urządzenia",
    
    // Hero Section
    secureChatTitle: "Bezpieczne wiadomości dla każdego",
    secureChatSubtitle: "Konwersacje szyfrowane end-to-end z kryptografią post-kwantową",
    getStarted: "Rozpocznij",
    
    // Voice Messages
    voiceRecordingNotSupported: "Nagrywanie głosu nie jest obsługiwane w tej przeglądarce",
    voiceMessageRecorded: "Wiadomość głosowa nagrana pomyślnie",
    recordingFailed: "Nie udało się nagrać wiadomości głosowej",
    playbackFailed: "Nie udało się odtworzyć wiadomości głosowej",
    microphonePermissionDenied: "Odmowa dostępu do mikrofonu",
    recordingStarted: "Rozpoczęto nagrywanie",
    microphoneAccessRequired: "Wymagany dostęp do mikrofonu",
    requestPermission: "Żądaj pozwolenia",
    recordingPaused: "Nagrywanie wstrzymane",
    recording: "Nagrywanie",
    tapToStartRecording: "Naciśnij, aby rozpocząć nagrywanie",
    maxDuration: "Maksymalny czas",
    voiceMessage: "Wiadomość głosowa",
    failedToLoadVoiceMessage: "Nie udało się załadować wiadomości głosowej",
    
    // Hero section features
    postQuantumEncryption: "Szyfrowanie post-kwantowe",
    threeMinuteSecurityProcess: "3-minutowy proces bezpieczeństwa",
    commercialGradePlatform: "Platforma klasy komercyjnej",
    enterpriseGradeSecurity: "Bezpieczeństwo klasy korporacyjnej",
    advancedPostQuantumEncryptionDescription: "Zaawansowane szyfrowanie post-kwantowe z protokołem Signal Double Ratchet."
  }
}

export type LanguageCode = keyof typeof languages