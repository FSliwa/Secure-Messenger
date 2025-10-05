export function Hero() {
  return (
    <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
      <div className="animate-fade-in-up">
        <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
          <span className="bg-gradient-to-r from-primary via-primary to-accent bg-clip-text text-transparent">
            SecureChat
          </span>
        </h1>
        <p className="mt-6 text-lg text-muted-foreground sm:text-xl lg:text-xl max-w-2xl leading-relaxed">
          Connect with friends and the world around you with 
          <span className="font-semibold text-foreground"> military-grade end-to-end encryption</span>.
          Your conversations stay private with 
          <span className="text-accent font-medium"> zero-knowledge architecture</span>.
        </p>
        
        {/* Feature highlights */}
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4 lg:grid-cols-1 lg:gap-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground lg:justify-start justify-center">
            <div className="w-2 h-2 bg-accent rounded-full animate-pulse-gentle" />
            <span>End-to-end encrypted</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground lg:justify-start justify-center">
            <div className="w-2 h-2 bg-primary rounded-full animate-pulse-gentle [animation-delay:0.5s]" />
            <span>Zero-knowledge security</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground lg:justify-start justify-center">
            <div className="w-2 h-2 bg-success rounded-full animate-pulse-gentle [animation-delay:1s]" />
            <span>Open source & audited</span>
          </div>
        </div>
      </div>
      
      <div className="mt-12 animate-fade-in-up [animation-delay:200ms]">
        <div className="relative mx-auto w-64 h-64 lg:w-80 lg:h-80">
          {/* Outer glow effect */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-primary/20 via-accent/20 to-primary/20 blur-2xl animate-pulse-gentle"></div>
          
          {/* Main shield container */}
          <div className="relative flex items-center justify-center h-full">
            {/* Background circle with subtle gradient */}
            <div className="absolute inset-8 rounded-full bg-gradient-to-br from-card via-background to-card border border-border/50 shadow-xl"></div>
            
            {/* Main lock icon */}
            <svg 
              className="relative w-32 h-32 lg:w-40 lg:h-40 text-primary drop-shadow-lg" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={1.5} 
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" 
              />
            </svg>
            
            {/* Rotating rings */}
            <div className="absolute inset-4 rounded-full border-2 border-dashed border-primary/30 animate-spin [animation-duration:20s]"></div>
            <div className="absolute inset-8 rounded-full border border-dashed border-accent/40 animate-spin [animation-duration:15s] [animation-direction:reverse]"></div>
            
            {/* Security badges */}
            <div className="absolute -top-2 -right-2 bg-accent text-accent-foreground text-xs font-bold px-2 py-1 rounded-full shadow-lg">
              2048-bit
            </div>
            <div className="absolute -bottom-2 -left-2 bg-primary text-primary-foreground text-xs font-bold px-2 py-1 rounded-full shadow-lg">
              RSA-OAEP
            </div>
          </div>
        </div>
        
        {/* Trust indicators */}
        <div className="mt-8 text-center lg:text-left">
          <p className="text-xs text-muted-foreground mb-3">Trusted by security professionals</p>
          <div className="flex items-center justify-center lg:justify-start gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <div className="w-3 h-3 bg-accent rounded-full flex items-center justify-center">
                <div className="w-1 h-1 bg-accent-foreground rounded-full"></div>
              </div>
              SOC 2 Compliant
            </span>
            <span className="flex items-center gap-1">
              <div className="w-3 h-3 bg-primary rounded-full flex items-center justify-center">
                <div className="w-1 h-1 bg-primary-foreground rounded-full"></div>
              </div>
              GDPR Ready
            </span>
            <span className="flex items-center gap-1">
              <div className="w-3 h-3 bg-success rounded-full flex items-center justify-center">
                <div className="w-1 h-1 bg-success-foreground rounded-full"></div>
              </div>
              Audited
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}