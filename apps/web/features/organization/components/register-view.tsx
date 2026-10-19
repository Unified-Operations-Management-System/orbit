"use client";

import { useState } from "react";
import Link from "next/link";
import { colors } from "@orbit/design-tokens";
import { OrbitMark } from "@/components/orbit-mark";
import { Button, Card, Checkbox, Input, Select, Shape, Stepper } from "@/components/ui";

const steps = ["Company details", "Your account", "Invite your team"];

const provinceOptions = ["ON", "QC", "BC", "AB", "MB", "NS"].map((p) => ({ value: p, label: p }));
const industryOptions = [
  "Bakery and tortilla manufacturing",
  "Snack food manufacturing",
  "Other food manufacturing",
].map((i) => ({ value: i, label: i }));
const inviteRoleOptions = ["Supervisor", "Employee", "HR Admin"].map((r) => ({ value: r, label: r }));

type Invitee = { id: number; email: string; role: string };

// TODO(backend): hard-coded for the Inception prototype. Registration is state only, nothing is sent.
export function RegisterView() {
  const [step, setStep] = useState(0);

  const [companyName, setCompanyName] = useState("");
  const [legalName, setLegalName] = useState("");
  const [province, setProvince] = useState(provinceOptions[0]!.value);
  const [industry, setIndustry] = useState(industryOptions[0]!.value);
  const [companyError, setCompanyError] = useState<string>();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nameError, setNameError] = useState<string>();
  const [emailError, setEmailError] = useState<string>();
  const [passwordError, setPasswordError] = useState<string>();

  const [invitees, setInvitees] = useState<Invitee[]>([{ id: 1, email: "", role: "Employee" }]);
  const [inviteLater, setInviteLater] = useState(false);
  const [created, setCreated] = useState(false);
  const [invitationCount, setInvitationCount] = useState(0);

  const continueCompany = () => {
    if (!companyName.trim()) return setCompanyError("Company name is required.");
    setCompanyError(undefined);
    setStep(1);
  };

  const continueAccount = () => {
    const nameOk = fullName.trim().length > 0;
    setNameError(nameOk ? undefined : "Your name is required.");
    const emailOk = /^\S+@\S+\.\S+$/.test(email);
    setEmailError(emailOk ? undefined : "Enter a valid email address.");
    const passwordOk = password.length >= 8;
    setPasswordError(passwordOk ? undefined : "Password must be at least 8 characters.");
    if (nameOk && emailOk && passwordOk) setStep(2);
  };

  const setInvitee = (id: number, patch: Partial<Invitee>) =>
    setInvitees((rows) => rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const create = () => {
    setInvitationCount(inviteLater ? 0 : invitees.filter((r) => r.email.trim()).length);
    setCreated(true);
  };

  const mainClass = "mx-auto flex w-full max-w-xl flex-col gap-8 px-6 pt-16 pb-6";

  if (created) {
    return (
      <main className={mainClass}>
        <div className="flex items-center gap-3">
          <OrbitMark size={36} />
          <span className="text-2xl font-extrabold">orbit</span>
        </div>
        <Card>
          <div className="flex flex-col items-center gap-4 py-8 text-center">
            <Shape shape="circle" color={colors.red} size={48} />
            <h1 className="text-[22px] font-extrabold">{companyName.trim()} is ready</h1>
            <p className="text-muted">
              {invitationCount > 0
                ? `We sent ${invitationCount} ${invitationCount === 1 ? "invitation" : "invitations"}.`
                : "You can invite your team any time from Organization."}
            </p>
            <Link
              href="/sign-in"
              className="inline-flex h-11 items-center justify-center gap-2 bg-red px-5 text-[15px] font-bold text-paper hover:brightness-95"
            >
              Go to dashboard
            </Link>
          </div>
        </Card>
      </main>
    );
  }

  return (
    <main className={mainClass}>
      <div className="flex items-center gap-3">
        <OrbitMark size={36} />
        <span className="text-2xl font-extrabold">orbit</span>
      </div>
      <div>
        <h1 className="text-[32px] font-extrabold leading-[1.05]">Register your company</h1>
      </div>
      <Stepper steps={steps} current={step} />
      <div className="flex flex-col gap-4">
        {step === 0 ? (
          <>
            <Input
              label="Company name"
              value={companyName}
              error={companyError}
              onChange={(e) => setCompanyName(e.target.value)}
            />
            <Input
              label="Legal name"
              value={legalName}
              onChange={(e) => setLegalName(e.target.value)}
            />
            <Select label="Province" value={province} options={provinceOptions} onChange={setProvince} />
            <Select label="Industry" value={industry} options={industryOptions} onChange={setIndustry} />
            <div className="mt-2 flex justify-end">
              <Button onClick={continueCompany}>Continue</Button>
            </div>
          </>
        ) : null}
        {step === 1 ? (
          <>
            <Input
              label="Your full name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              error={nameError}
            />
            <Input
              label="Work email"
              type="email"
              value={email}
              error={emailError}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Input
              label="Password"
              type="password"
              value={password}
              hint="At least 8 characters."
              error={passwordError}
              onChange={(e) => setPassword(e.target.value)}
            />
            <div className="mt-2 flex justify-between">
              <Button variant="ghost" onClick={() => setStep(0)}>Back</Button>
              <Button onClick={continueAccount}>Continue</Button>
            </div>
          </>
        ) : null}
        {step === 2 ? (
          <>
            {!inviteLater && invitees.length < 3 ? (
              <Button variant="ghost" onClick={() => setInvitees([...invitees, { id: Date.now(), email: "", role: "Employee" }])}>
                Add another
              </Button>
            ) : null}
            {inviteLater ? null : (
              invitees.map((inv) => (
                <div key={inv.id} className="flex items-start gap-3">
                  <div className="flex-1">
                    <Input
                      label="Email"
                      type="email"
                      value={inv.email}
                      onChange={(e) => setInvitee(inv.id, { email: e.target.value })}
                    />
                  </div>
                  <div className="w-44">
                    <Select
                      label="Role"
                      value={inv.role}
                      options={inviteRoleOptions}
                      onChange={(v) => setInvitee(inv.id, { role: v })}
                    />
                  </div>
                </div>
              ))
            )}
            <Checkbox
              label="I'll invite people later"
              checked={inviteLater}
              onChange={(e) => setInviteLater(e.target.checked)}
            />
            <div className="mt-2 flex justify-between">
              <Button variant="ghost" onClick={() => setStep(1)}>Back</Button>
              <Button onClick={create}>Create company</Button>
            </div>
          </>
        ) : null}
      </div>
    </main>
  );
}
