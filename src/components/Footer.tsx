import { EmailTestDialog } from './EmailTestDialog';

export function Footer() {
  return (
    <>
      <footer className="border-t bg-background">
        <div className="container mx-auto max-w-screen-xl px-6 py-12">
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Product</h3>
              <ul className="mt-4 space-y-2">
                <li>
                  <button className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    Features
                  </button>
                </li>
                <li>
                  <button className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    Security
                  </button>
                </li>
                <li>
                  <button className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    Pricing
                  </button>
                </li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-sm font-semibold text-foreground">Company</h3>
              <ul className="mt-4 space-y-2">
                <li>
                  <button className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    About
                  </button>
                </li>
                <li>
                  <button className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    Blog
                  </button>
                </li>
                <li>
                  <button className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    Careers
                  </button>
                </li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-sm font-semibold text-foreground">Support</h3>
              <ul className="mt-4 space-y-2">
                <li>
                  <button className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    Help Center
                  </button>
                </li>
                <li>
                  <button className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    Contact
                  </button>
                </li>
                <li>
                  <button className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    Status
                  </button>
                </li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-sm font-semibold text-foreground">Legal</h3>
              <ul className="mt-4 space-y-2">
                <li>
                  <button className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    Privacy Policy
                  </button>
                </li>
                <li>
                  <button className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    Terms of Service
                  </button>
                </li>
                <li>
                  <button className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    Cookie Policy
                  </button>
                </li>
              </ul>
            </div>
          </div>
          
          <div className="mt-12 pt-8 border-t">
            <div className="flex flex-col sm:flex-row justify-between items-center">
              <div className="flex items-center space-x-2">
                <div className="flex h-6 w-6 items-center justify-center rounded bg-primary text-primary-foreground">
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                    />
                  </svg>
                </div>
                <span className="font-semibold text-foreground">SecureChat</span>
              </div>
              
              <p className="mt-4 sm:mt-0 text-sm text-muted-foreground">
                © 2024 SecureChat. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </footer>
      
      {/* Email Test Dialog - Development Tool */}
      <EmailTestDialog />
    </>
  );
}