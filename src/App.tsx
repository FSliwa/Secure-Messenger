import { Toaster } from "@/components/ui/sonner";
import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { SignUpCard } from "@/components/SignUpCard";
import { SecurityCallout } from "@/components/SecurityCallout";
import { Footer } from "@/components/Footer";

function App() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main>
        {/* Hero and Registration Section */}
        <section className="py-12 sm:py-20 lg:py-24">
          <div className="container mx-auto max-w-screen-xl px-6">
            <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 items-center">
              {/* Left Column - Hero */}
              <div className="order-2 lg:order-1">
                <Hero />
              </div>
              
              {/* Right Column - Registration Form */}
              <div className="order-1 lg:order-2 flex flex-col items-center lg:items-end">
                <SignUpCard />
                <div className="mt-6 w-full max-w-md">
                  <SecurityCallout />
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      
      <Footer />
      <Toaster position="top-center" />
    </div>
  );
}

export default App;