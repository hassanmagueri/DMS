"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AuthFrame } from "@/components/auth-frame";
import { useAuth } from "@/components/providers";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError } from "@/lib/api";
import { homeForRole } from "@/lib/format";

type Step = "credentials" | "email" | "code" | "password";

export default function LoginPage() {
  const { user, loading, login, startEmailLink, confirmLogin, completePassword } = useAuth();
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [address, setAddress] = useState("");
  const [code, setCode] = useState("");
  const [previewCode, setPreviewCode] = useState<string | null>(null);
  const [setupToken, setSetupToken] = useState("");
  const [nextPassword, setNextPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [step, setStep] = useState<Step>("credentials");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (loading || !user) return;
    router.replace(homeForRole(user.role));
  }, [loading, user, router]);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    try {
      if (step === "credentials") {
        const result = await login(username, password);
        if (result.status === "setup") {
          setAddress(result.email);
          setStep("email");
          toast.success("Enter the email for this account");
          return;
        }
        toast.success("Signed in");
        router.replace(homeForRole(result.user.role));
        return;
      }
      if (step === "email") {
        const result = await startEmailLink(username, password, address);
        setPreviewCode(result.previewCode);
        setCode(result.previewCode ?? "");
        setStep("code");
        toast.success(result.previewCode ? "Enter the code to confirm this email" : "We emailed a code to confirm this account");
        return;
      }
      if (step === "code") {
        const result = await confirmLogin(username, code);
        setSetupToken(result.setupToken);
        setStep("password");
        toast.success("Create your password");
        return;
      }
      if (nextPassword !== confirm) {
        toast.error("Those passwords do not match");
        return;
      }
      const ready = await completePassword(setupToken, nextPassword);
      toast.success("Password saved");
      router.replace(homeForRole(ready.role));
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Could not sign in");
    } finally {
      setSubmitting(false);
    }
  }

  const description =
    step === "email"
      ? "This is the first sign-in. Enter the email for this account."
      : step === "code"
        ? `Enter the 6-digit code sent to ${address}.`
        : step === "password"
          ? "Choose the password you will use from now on."
          : "Sign in with your username. The first time, you confirm an email and choose your own password.";

  const submitLabel =
    step === "credentials"
      ? "Sign in"
      : step === "email"
        ? "Email me a code"
        : step === "code"
          ? "Confirm email"
          : "Save password and sign in";

  return (
    <AuthFrame>
      <Card className="w-full max-w-md border-0 shadow-none lg:border lg:shadow-sm">
        <CardHeader>
          <CardTitle className="text-2xl">Sign in</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={onSubmit}>
            {step === "credentials" ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    autoComplete="username"
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                  />
                </div>
              </>
            ) : null}
            {step === "email" ? (
              <div className="space-y-2">
                <Label htmlFor="address">Email</Label>
                <Input
                  id="address"
                  type="email"
                  autoComplete="email"
                  value={address}
                  onChange={(event) => setAddress(event.target.value)}
                  required
                />
              </div>
            ) : null}
            {step === "code" ? (
              <div className="space-y-2">
                <Label htmlFor="code">Verification code</Label>
                <Input
                  id="code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  placeholder="000000"
                  value={code}
                  onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                  required
                />
                {previewCode ? (
                  <p className="text-xs text-muted-foreground">
                    Mail is not configured on this desk, so the code is shown here: {previewCode}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">The code expires in 10 minutes.</p>
                )}
              </div>
            ) : null}
            {step === "password" ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="next-password">New password</Label>
                  <Input
                    id="next-password"
                    type="password"
                    autoComplete="new-password"
                    minLength={8}
                    value={nextPassword}
                    onChange={(event) => setNextPassword(event.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm password</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    autoComplete="new-password"
                    minLength={8}
                    value={confirm}
                    onChange={(event) => setConfirm(event.target.value)}
                    required
                  />
                </div>
              </>
            ) : null}
            <Button className="w-full" type="submit" disabled={submitting}>
              {submitting ? "Checking..." : submitLabel}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              No account yet?{" "}
              <Link className="font-medium text-primary" href="/signup">
                Create one
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </AuthFrame>
  );
}
