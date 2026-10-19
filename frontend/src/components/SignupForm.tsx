"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Logo from "@/components/Logo";
import { register, uploadIcon } from "@/lib/api";
import { hashPassword } from "@/lib/password";
import {
  AffiliationField,
  IconField,
  NameField,
  PasswordField,
  SocialLinksFields,
  UsernameField,
  toSocialLinkSlots,
} from "@/components/ProfileFields";

interface SignupFormProps {
  onSwitchToLogin?: () => void;
}

export function SignupForm({ onSwitchToLogin }: SignupFormProps) {
  const router = useRouter();
  const [iconPreview, setIconPreview] = useState<string | null>(null);
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [username, setUsername] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [affiliation, setAffiliation] = useState("");
  const [socialLinks, setSocialLinks] = useState<string[]>(toSocialLinkSlots);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      // Username validation: only lowercase letters, numbers and underscore
      const usernameRE = /^[a-z0-9_]+$/;
      if (!usernameRE.test(username)) {
        throw new Error("Username may only contain lowercase letters, numbers, and underscore (_).");
      }

      const passwordHash = await hashPassword(password, username);

      const filteredSocialLinks = socialLinks.filter(link => link.trim() !== "");
      
      if (filteredSocialLinks.length === 0) {
        throw new Error("少なくとも1つのSocial Linkを入力してください");
      }

      // ユーザー登録
      const registerResult = await register(
        username,
        passwordHash,
        name || undefined,
        affiliation || undefined,
        filteredSocialLinks
      );

      // アイコンがある場合はアップロード
      if (iconFile && registerResult.id) {
        try {
          await uploadIcon(registerResult.id, passwordHash, iconFile);
        } catch (iconErr) {
          console.error("Icon upload failed:", iconErr);
          // アイコンアップロード失敗は登録自体は成功しているので警告のみ
          // エラーは表示するが、登録は成功として扱う
        }
      }

      // 成功したらsparkleページへリダイレクト
      router.push("/sparkle");
    } catch (err) {
      console.error("Signup error:", err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("登録に失敗しました");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-[90vw] sm:w-full sm:max-w-md bg-slate-50 border-none shadow-lg font-inter">
      <CardHeader className="space-y-1.5 pt-4 pb-2">
        {/* Logo */}
        <div className="flex justify-end mb-0 -mr-4">
          <Logo className="h-12 w-auto text-slate-400 opacity-40" />
        </div>
        
        <CardTitle className="text-xl font-semibold text-slate-900">
          Create your account
        </CardTitle>
        <CardDescription className="text-sm text-slate-600">
          Enter your information below to get started
        </CardDescription>
        <p className="text-xs text-slate-500">
          Already have an account?{" "}
          <button 
            type="button"
            onClick={(e) => {
              e.preventDefault();
              onSwitchToLogin?.();
            }}
            className="text-slate-700 hover:underline"
          >
            Log in <span className="text-slate-400">here</span>
          </button>
        </p>
      </CardHeader>
      
      <CardContent className="px-6 pb-6">
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-3">
          <IconField
            preview={iconPreview}
            onChange={(file, previewUrl) => {
              setIconFile(file);
              setIconPreview(previewUrl);
            }}
          />
          <UsernameField value={username} onChange={setUsername} />
          <NameField value={name} onChange={setName} />
          <PasswordField
            id="password"
            label="Password"
            value={password}
            onChange={setPassword}
            hint="Passwords can include uppercase and lowercase letters, NUMBERS, and symbols ( A,a,1,! )"
          />
          <AffiliationField value={affiliation} onChange={setAffiliation} />
          <SocialLinksFields links={socialLinks} onChange={setSocialLinks} />

          {/* Submit Button */}
          <div className="flex justify-end mt-4 pt-2">
            <Button 
              type="submit" 
              className="bg-slate-900 hover:bg-slate-800 text-white px-8"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Signing up..." : "Sign up"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
