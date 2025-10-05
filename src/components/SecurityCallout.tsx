import { Shield } from "@phosphor-icons/react";

export function SecurityCallout() {
  return (
    <div className="rounded-lg border bg-card p-6 shadow-sm animate-fade-in-up [animation-delay:400ms]">
      <div className="space-y-4">
        <div className="flex items-start space-x-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <Shield className="h-6 w-6 text-primary" weight="duotone" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Enterprise-Grade Security</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Advanced post-quantum encryption with Signal Double Ratchet protocol.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}