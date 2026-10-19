"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Profile inputs shared by SignupForm and SettingsForm

export const SOCIAL_LINK_SLOTS = 5;

/** Pads saved links to the fixed number of input slots. */
export function toSocialLinkSlots(links: string[] = []): string[] {
  return Array.from({ length: SOCIAL_LINK_SLOTS }, (_, i) => links[i] ?? "");
}

export function IconField({
  preview,
  onChange,
}: {
  preview: string | null;
  onChange: (file: File, previewUrl: string) => void;
}) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => onChange(file, reader.result as string);
    reader.readAsDataURL(file);
  };

  return (
    <div className="flex justify-center my-3">
      <label htmlFor="icon-upload" className="cursor-pointer">
        <div className="w-20 h-20 rounded-full bg-slate-200 flex items-center justify-center overflow-hidden border-2 border-slate-300 hover:border-slate-400 transition-colors">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="Icon preview" className="w-full h-full object-cover" />
          ) : (
            <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          )}
        </div>
        <input
          id="icon-upload"
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleChange}
        />
      </label>
    </div>
  );
}

export function UsernameField({
  value,
  onChange,
  disabled = false,
}: {
  value: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor="username" className="text-sm font-medium text-slate-900">
        Username{!disabled && <span className="text-red-500">*</span>}
      </Label>
      <Input
        id="username"
        type="text"
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        className="bg-white border-slate-300 focus:border-slate-500 disabled:bg-slate-100"
        pattern="[a-z0-9_]+"
        title="Only lowercase letters (a-z), numbers (0-9), and underscore (_) are allowed"
        required={!disabled}
        disabled={disabled}
      />
      <p className="text-xs text-slate-500 mt-1">
        {disabled
          ? "Your @username cannot be changed."
          : "Enter your @username. Allowed: lowercase letters (a-z), numbers (0-9), underscore (_)."}
      </p>
    </div>
  );
}

export function NameField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor="name" className="text-sm font-medium text-slate-900">
        Name<span className="text-red-500">*</span>
      </Label>
      <Input
        id="name"
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-white border-slate-300 focus:border-slate-500"
        required
      />
      <p className="text-xs text-slate-500 mt-1">Enter your nickname</p>
    </div>
  );
}

export function AffiliationField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor="affiliation" className="text-sm font-medium text-slate-900">
        Affiliation
      </Label>
      <Input
        id="affiliation"
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-white border-slate-300 focus:border-slate-500"
      />
      <p className="text-xs text-slate-500 mt-1">Enter your affiliation and position</p>
    </div>
  );
}

export function SocialLinksFields({
  links,
  onChange,
}: {
  links: string[];
  onChange: (links: string[]) => void;
}) {
  const update = (index: number, value: string) => {
    const next = [...links];
    next[index] = value;
    onChange(next);
  };

  return (
    <>
      {links.map((link, i) => (
        <div key={i} className="space-y-1.5">
          <Label htmlFor={`social-link-${i + 1}`} className="text-sm font-medium text-slate-900">
            Social Links{i + 1}
            {i === 0 && <span className="text-red-500">*</span>}
          </Label>
          <Input
            id={`social-link-${i + 1}`}
            type="text"
            value={link}
            onChange={(e) => update(i, e.target.value)}
            className="bg-white border-slate-300 focus:border-slate-500"
            required={i === 0}
          />
          <p className="text-xs text-slate-500 mt-1">
            Enter your social account links (X,Instagram...)
          </p>
        </div>
      ))}
    </>
  );
}

export function PasswordField({
  id,
  label,
  value,
  onChange,
  hint,
  required = true,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
  required?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-sm font-medium text-slate-900">
        {label}
        {required && <span className="text-red-500">*</span>}
      </Label>
      <Input
        id={id}
        type="password"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-white border-slate-300 focus:border-slate-500"
        required={required}
      />
      {hint && <p className="text-xs text-slate-500 mt-1">{hint}</p>}
    </div>
  );
}
