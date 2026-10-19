"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AffiliationField,
  IconField,
  NameField,
  PasswordField,
  SocialLinksFields,
  UsernameField,
  toSocialLinkSlots,
} from "@/components/ProfileFields";
import {
  AuthError,
  changePassword,
  getAuthFromStorage,
  getUser,
  updateProfile,
  uploadIcon,
} from "@/lib/api";
import { hashPassword } from "@/lib/password";

type Status = { kind: "success" | "error"; message: string } | null;

function StatusMessage({ status }: { status: Status }) {
  if (!status) return null;
  const isError = status.kind === "error";
  return (
    <div
      className={`mb-4 p-3 rounded-md border ${
        isError ? "bg-red-50 border-red-200" : "bg-emerald-50 border-emerald-200"
      }`}
    >
      <p className={`text-sm ${isError ? "text-red-600" : "text-emerald-700"}`}>{status.message}</p>
    </div>
  );
}

const errorMessage = (err: unknown, fallback: string) => (err instanceof Error ? err.message : fallback);

export function SettingsForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  const [username, setUsername] = useState("");
  const [iconPreview, setIconPreview] = useState<string | null>(null);
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [affiliation, setAffiliation] = useState("");
  const [socialLinks, setSocialLinks] = useState<string[]>(toSocialLinkSlots);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileStatus, setProfileStatus] = useState<Status>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordStatus, setPasswordStatus] = useState<Status>(null);

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
        setProfileStatus({ kind: "error", message: errorMessage(err, "ユーザー情報の取得に失敗しました") });
        setLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { userId, passwordHash } = getAuthFromStorage();
    if (!userId || !passwordHash) return router.replace("/");

    const filledLinks = socialLinks.map((link) => link.trim()).filter((link) => link !== "");
    if (filledLinks.length === 0) {
      setProfileStatus({ kind: "error", message: "少なくとも1つのSocial Linkを入力してください" });
      return;
    }

    setIsSavingProfile(true);
    setProfileStatus(null);
    try {
      await updateProfile(userId, passwordHash, { name, affiliation, socialLinks: filledLinks });
      if (iconFile) {
        const { icon_url } = await uploadIcon(userId, passwordHash, iconFile);
        setIconPreview(icon_url);
        setIconFile(null);
      }
      setSocialLinks(toSocialLinkSlots(filledLinks));
      setProfileStatus({ kind: "success", message: "プロフィールを保存しました" });
    } catch (err) {
      if (handleAuthError(err)) return;
      setProfileStatus({ kind: "error", message: errorMessage(err, "プロフィールの保存に失敗しました") });
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { userId, passwordHash } = getAuthFromStorage();
    if (!userId || !passwordHash) return router.replace("/");

    if (newPassword !== confirmPassword) {
      setPasswordStatus({ kind: "error", message: "新しいパスワードが確認用と一致しません" });
      return;
    }

    setIsChangingPassword(true);
    setPasswordStatus(null);
    try {
      // Check locally first: a typo here should not reach the server, where a 401 signs the user out
      const currentKey = await hashPassword(currentPassword, username);
      if (currentKey !== passwordHash) {
        setPasswordStatus({ kind: "error", message: "現在のパスワードが違います" });
        return;
      }
      await changePassword(userId, currentKey, await hashPassword(newPassword, username));
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordStatus({ kind: "success", message: "パスワードを変更しました" });
    } catch (err) {
      if (handleAuthError(err)) return;
      setPasswordStatus({ kind: "error", message: errorMessage(err, "パスワードの変更に失敗しました") });
    } finally {
      setIsChangingPassword(false);
    }
  };

  if (loading) {
    return <p className="text-white">Loading...</p>;
  }

  return (
    <div className="flex flex-col gap-6 w-[90vw] sm:w-full sm:max-w-md">
      <Card className="bg-slate-50 border-none shadow-lg font-inter">
        <CardHeader className="space-y-1.5 pt-4 pb-2">
          <CardTitle className="text-xl font-semibold text-slate-900">Profile</CardTitle>
          <CardDescription className="text-sm text-slate-600">
            Update the information shown on your card
          </CardDescription>
        </CardHeader>
        <CardContent className="px-6 pb-6">
          <StatusMessage status={profileStatus} />
          <form onSubmit={handleProfileSubmit} className="space-y-3">
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
                disabled={isSavingProfile}
              >
                {isSavingProfile ? "Saving..." : "Save"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="bg-slate-50 border-none shadow-lg font-inter">
        <CardHeader className="space-y-1.5 pt-4 pb-2">
          <CardTitle className="text-xl font-semibold text-slate-900">Password</CardTitle>
          <CardDescription className="text-sm text-slate-600">
            Other devices will need to log in again after you change it
          </CardDescription>
        </CardHeader>
        <CardContent className="px-6 pb-6">
          <StatusMessage status={passwordStatus} />
          <form onSubmit={handlePasswordSubmit} className="space-y-3">
            <PasswordField
              id="current-password"
              label="Current password"
              value={currentPassword}
              onChange={setCurrentPassword}
            />
            <PasswordField
              id="new-password"
              label="New password"
              value={newPassword}
              onChange={setNewPassword}
              hint="Passwords can include uppercase and lowercase letters, NUMBERS, and symbols ( A,a,1,! )"
            />
            <PasswordField
              id="confirm-password"
              label="Confirm new password"
              value={confirmPassword}
              onChange={setConfirmPassword}
            />
            <div className="flex justify-end mt-4 pt-2">
              <Button
                type="submit"
                className="bg-slate-900 hover:bg-slate-800 text-white px-8"
                disabled={isChangingPassword}
              >
                {isChangingPassword ? "Changing..." : "Change password"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
