"use client";

import { useState } from "react";
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

export default function SignupForm() {
  const { register, confirmRegister } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    username: "",
    email: "",
    phone: "",
    password: "",
  });
  const [code, setCode] = useState("");
  const [previewCode, setPreviewCode] = useState<string | null>(null);
  const [step, setStep] = useState<"details" | "code">("details");
  const [submitting, setSubmitting] = useState(false);

  function setField(field: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    try {
      if (step === "details") {
        const result = await register(form);
        if (result.status === "created") {
          toast.success("Account created");
          router.replace(homeForRole(result.user.role));
          return;
        }
        setPreviewCode(result.previewCode);
        setCode(result.previewCode ?? "");
        setStep("code");
        toast.success(result.previewCode ? "Enter the sign-up code" : "Verification email sent");
        return;
      }
      const created = await confirmRegister(form.username, code);
      toast.success("Account created");
      router.replace(homeForRole(created.role));
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Could not create the account");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthFrame>
      <Card className="w-full max-w-md border-0 shadow-none lg:border lg:shadow-sm">
        <CardHeader>
          <CardTitle className="text-2xl">Create an account</CardTitle>
          <CardDescription>
            {step === "details"
              ? "Create a customer account with a username and email."
              : `Enter the 6-digit code sent to ${form.email}.`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={onSubmit}>
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
            ) : (
            <>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="firstName">First name</Label>
                <Input
                  id="firstName"
                  value={form.firstName}
                  onChange={(event) => setField("firstName", event.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last name</Label>
                <Input
                  id="lastName"
                  value={form.lastName}
                  onChange={(event) => setField("lastName", event.target.value)}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                autoComplete="username"
                value={form.username}
                onChange={(event) => setField("username", event.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={form.email}
                onChange={(event) => setField("email", event.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                autoComplete="tel"
                value={form.phone}
                onChange={(event) => setField("phone", event.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                minLength={8}
                value={form.password}
                onChange={(event) => setField("password", event.target.value)}
                required
              />
            </div>
            </>
            )}
            <Button className="w-full" type="submit" disabled={submitting}>
              {submitting ? "Checking..." : step === "details" ? "Email me a code" : "Confirm and create account"}
            </Button>
            {step === "code" ? (
              <Button
                className="w-full"
                type="button"
                variant="outline"
                disabled={submitting}
                onClick={() => {
                  setStep("details");
                  setCode("");
                  setPreviewCode(null);
                }}
              >
                Edit account details
              </Button>
            ) : null}
            <p className="text-center text-sm text-muted-foreground">
              Already registered?{" "}
              <Link className="font-medium text-primary" href="/login">
                Sign in
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </AuthFrame>
  );
}
