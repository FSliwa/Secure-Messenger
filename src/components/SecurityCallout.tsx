import { Shield, Key, Lock, Eye, FileArrowUp } from "@phosphor-icons/react";

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
              Advanced 2048-bit post-quantum encryption with Signal Double Ratchet protocol.
              Key generation takes ~3 minutes for maximum security.
            </p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Key className="h-4 w-4" />
            <span>X3DH/PQXDH Key Exchange</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Lock className="h-4 w-4" />
            <span>Per-Message Ratcheting</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Eye className="h-4 w-4" />
            <span>Safety Number Verification</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <FileArrowUp className="h-4 w-4" />
            <span>Chunked File Encryption</span>
          </div>
        </div>
      </div>
    </div>
  );
}