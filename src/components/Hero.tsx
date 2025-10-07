import { useLanguage } from '@/contexts/LanguageContext'

export function Hero() {
  const { t } = useLanguage()
  
  return (
    <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
      <div className="animate-fade-in-up">
        <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
          <span className="bg-gradient-to-r from-primary via-primary to-accent bg-clip-text text-transparent">
            SecureChat Pro
          </span>
        </h1>
        <p className="mt-8 text-lg text-muted-foreground sm:text-xl lg:text-xl max-w-2xl leading-relaxed">
          {t.secureChatSubtitle}
        </p>
        
        {/* Feature highlights */}
        <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-6 lg:grid-cols-1 lg:gap-4">
          <div className="flex items-center gap-3 text-sm text-muted-foreground lg:justify-start justify-center">
            <div className="w-2 h-2 bg-accent rounded-full" />
            <span>Post-quantum encryption</span>
          </div>
          <div className="flex items-center gap-3 text-sm text-muted-foreground lg:justify-start justify-center">
            <div className="w-2 h-2 bg-primary rounded-full" />
            <span>3-minute security process</span>
          </div>
          <div className="flex items-center gap-3 text-sm text-muted-foreground lg:justify-start justify-center">
            <div className="w-2 h-2 bg-success rounded-full" />
            <span>Commercial-grade platform</span>
          </div>
        </div>
      </div>
    </div>
  );
}
