"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AffiliationField,
  IconField,
  NameField,
  SocialLinksFields,
  StatusMessage,
  UsernameField,
  errorMessage,
  toSocialLinkSlots,
  type FormStatus,
} from "@/components/ProfileFields";
import {
  AuthError,
  PROFILE_UPDATED_EVENT,
  getAuthFromStorage,
  getUser,
  updateProfile,
  uploadIcon,
} from "@/lib/api";

export function ProfileForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  const [username, setUsername] = useState("");
  const [iconPreview, setIconPreview] = useState<string | null>(null);
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [affiliation, setAffiliation] = useState("");
  const [socialLinks, setSocialLinks] = useState<string[]>(toSocialLinkSlots);
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState<FormStatus>(null);

  // AuthError means the stored credentials were rejected and cleared: send the user to log in again
  const handleAuthError = (err: unknown) => {
    if (!(err instanceof AuthError)) return false;
    router.replace("/");
    return true;
  };

  useEffect(() => {
    const { userId, passwordHash } = getAuthFromStorage();
    if (!userId || !passwordHash) {
      router.replace("/");
      return;
    }

    getUser(userId, userId, passwordHash)
      .then((user) => {
        setUsername(user.username);
        setName(user.name ?? "");
        setAffiliation(user.affiliation ?? "");
        setSocialLinks(toSocialLinkSlots(user.social_links));
        setIconPreview(user.icon_url);
        setLoading(false);
      })
      .catch((err) => {
        if (handleAuthError(err)) return;
        setStatus({ kind: "error", message: errorMessage(err, "ユーザー情報の取得に失敗しました") });
        setLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { userId, passwordHash } = getAuthFromStorage();
    if (!userId || !passwordHash) return router.replace("/");

    const filledLinks = socialLinks.map((link) => link.trim()).filter((link) => link !== "");
    if (filledLinks.length === 0) {
      setStatus({ kind: "error", message: "少なくとも1つのSocial Linkを入力してください" });
      return;
    }

    setIsSaving(true);
    setStatus(null);
    try {
      await updateProfile(userId, passwordHash, { name, affiliation, socialLinks: filledLinks });
      if (iconFile) {
        const { icon_url } = await uploadIcon(userId, passwordHash, iconFile);
        setIconPreview(icon_url);
        setIconFile(null);
      }
      setSocialLinks(toSocialLinkSlots(filledLinks));
      setStatus({ kind: "success", message: "プロフィールを保存しました" });
      window.dispatchEvent(new Event(PROFILE_UPDATED_EVENT));
    } catch (err) {
      if (handleAuthError(err)) return;
      setStatus({ kind: "error", message: errorMessage(err, "プロフィールの保存に失敗しました") });
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return <p className="text-white">Loading...</p>;
  }

  return (
    <Card className="w-[90vw] sm:w-full sm:max-w-md bg-slate-50 border-none shadow-lg font-inter">
      <CardHeader className="space-y-1.5 pt-4 pb-2">
        <CardTitle className="text-xl font-semibold text-slate-900">Profile</CardTitle>
        <CardDescription className="text-sm text-slate-600">
          Update the information shown on your card
        </CardDescription>
      </CardHeader>
      <CardContent className="px-6 pb-6">
        <StatusMessage status={status} />
        <form onSubmit={handleSubmit} className="space-y-3">
          <IconField
            preview={iconPreview}
            onChange={(file, previewUrl) => {
              setIconFile(file);
              setIconPreview(previewUrl);
            }}
          />
          <UsernameField value={username} disabled />
          <NameField value={name} onChange={setName} />
          <AffiliationField value={affiliation} onChange={setAffiliation} />
          <SocialLinksFields links={socialLinks} onChange={setSocialLinks} />
          <div className="flex justify-end mt-4 pt-2">
            <Button
              type="submit"
              className="bg-slate-900 hover:bg-slate-800 text-white px-8"
              disabled={isSaving}
            >
              {isSaving ? "Saving..." : "Save"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
