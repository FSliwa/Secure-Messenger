export function Hero() {
  return (
    <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
      <div className="animate-fade-in-up">
        <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
          SecureChat
        </h1>
        <p className="mt-6 text-lg text-muted-foreground sm:text-xl lg:text-xl max-w-2xl">
          Connect with friends and the world around you with end-to-end encrypted messaging.
        </p>
      </div>
      
      <div className="mt-12 animate-fade-in-up [animation-delay:200ms]">
        <div className="relative mx-auto w-64 h-64 lg:w-80 lg:h-80">
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-primary/20 to-accent/20 blur-xl"></div>
          <div className="relative flex items-center justify-center h-full">
            <svg 
              className="w-32 h-32 lg:w-40 lg:h-40 text-primary" 
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
            <div className="absolute -inset-4 rounded-full border-2 border-dashed border-primary/30 animate-pulse-gentle"></div>
          </div>
        </div>
      </div>
    </div>
  );
}