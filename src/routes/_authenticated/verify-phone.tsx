import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { sendPhoneOtp, verifyPhoneOtp } from "@/lib/phone.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { toast } from "sonner";
import { CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/verify-phone")({
  component: VerifyPhone,
});

function VerifyPhone() {
  const send = useServerFn(sendPhoneOtp);
  const verify = useServerFn(verifyPhoneOtp);
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [stage, setStage] = useState<"phone" | "otp" | "done">("phone");
  const [devOtp, setDevOtp] = useState<string | null>(null);

  const sendMut = useMutation({
    mutationFn: () => send({ data: { phone } }),
    onSuccess: (r: { devOtp?: string }) => {
      setStage("otp");
      if (r?.devOtp) {
        setDevOtp(r.devOtp);
        toast.info(`Dev OTP: ${r.devOtp}`);
      } else toast.success("OTP sent");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const verifyMut = useMutation({
    mutationFn: () => verify({ data: { otp } }),
    onSuccess: () => {
      setStage("done");
      toast.success("Phone verified!");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <main className="mx-auto max-w-md px-6 py-10">
      <h1 className="font-display text-2xl mb-1">Verify your phone</h1>
      <p className="text-muted-foreground text-sm mb-6">
        A verified phone earns trust and unlocks messaging faster.
      </p>

      {stage === "phone" && (
        <div className="space-y-4">
          <div>
            <Label>Phone (Indian mobile, no +91)</Label>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="9876543210"
            />
          </div>
          <Button
            className="w-full"
            onClick={() => sendMut.mutate()}
            disabled={sendMut.isPending || phone.length < 10}
          >
            {sendMut.isPending ? "Sending…" : "Send OTP"}
          </Button>
        </div>
      )}

      {stage === "otp" && (
        <div className="space-y-4">
          <div>
            <Label>Enter the 6-digit code sent to {phone}</Label>
            <Input
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
              inputMode="numeric"
            />
            {devOtp && <p className="text-xs text-muted-foreground mt-1">Dev mode OTP: {devOtp}</p>}
          </div>
          <Button
            className="w-full"
            onClick={() => verifyMut.mutate()}
            disabled={verifyMut.isPending || otp.length !== 6}
          >
            {verifyMut.isPending ? "Verifying…" : "Verify"}
          </Button>
          <Button variant="ghost" className="w-full" onClick={() => setStage("phone")}>
            Change number
          </Button>
        </div>
      )}

      {stage === "done" && (
        <div className="rounded-lg border border-primary/40 bg-primary/5 p-6 text-center">
          <CheckCircle2 className="w-10 h-10 text-primary mx-auto mb-2" />
          <p className="font-medium">Phone verified successfully.</p>
        </div>
      )}
    </main>
  );
}
