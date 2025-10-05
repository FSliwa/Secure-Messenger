import { Shield } from "@phosphor-icons/react";

export function SecurityCallout() {
  return (
    <div className="rounded-lg border bg-card p-6 shadow-sm animate-fade-in-up [animation-delay:400ms]">
      <div className="flex items-start space-x-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <Shield className="h-6 w-6 text-primary" weight="duotone" />
        </div>
        <div>
          <h3 className="font-semibold text-foreground">Extreme Security</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Your account will be protected with 16384-bit post-quantum encryption keys. 
            Key generation takes 1-2 minutes.
          </p>
        </div>
      </div>
    </div>
  );
}