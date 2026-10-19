"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  PasswordField,
  StatusMessage,
  errorMessage,
  type FormStatus,
} from "@/components/ProfileFields";
import { AuthError, changePassword, getAuthFromStorage, getUser } from "@/lib/api";
import { hashPassword } from "@/lib/password";

/** Account settings. For now only the password; profile fields live in ProfileForm. */
export function SettingsForm() {
  const router = useRouter();
  // The username salts the password key (see lib/password.ts)
  const [username, setUsername] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChanging, setIsChanging] = useState(false);
  const [status, setStatus] = useState<FormStatus>(null);

  useEffect(() => {
    const { userId } = getAuthFromStorage();
    if (!userId) {
      router.replace("/");
      return;
    }
    getUser(userId)
      .then((user) => setUsername(user.username))
      .catch((err) =>
        setStatus({ kind: "error", message: errorMessage(err, "ユーザー情報の取得に失敗しました") }),
      );
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { userId, passwordHash } = getAuthFromStorage();
    if (!userId || !passwordHash) return router.replace("/");
    if (!username) return;

    if (newPassword !== confirmPassword) {
      setStatus({ kind: "error", message: "新しいパスワードが確認用と一致しません" });
      return;
    }

    setIsChanging(true);
    setStatus(null);
    try {
      // Check locally first: a typo here should not reach the server, where a 401 signs the user out
      const currentKey = await hashPassword(currentPassword, username);
      if (currentKey !== passwordHash) {
        setStatus({ kind: "error", message: "現在のパスワードが違います" });
        return;
      }
      await changePassword(userId, currentKey, await hashPassword(newPassword, username));
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setStatus({ kind: "success", message: "パスワードを変更しました" });
    } catch (err) {
      if (err instanceof AuthError) {
        router.replace("/");
        return;
      }
      setStatus({ kind: "error", message: errorMessage(err, "パスワードの変更に失敗しました") });
    } finally {
      setIsChanging(false);
    }
  };

  return (
    <Card className="w-[90vw] sm:w-full sm:max-w-md bg-slate-50 border-none shadow-lg font-inter">
      <CardHeader className="space-y-1.5 pt-4 pb-2">
        <CardTitle className="text-xl font-semibold text-slate-900">Settings</CardTitle>
        <CardDescription className="text-sm text-slate-600">
          Change your password. Other devices will need to log in again.
        </CardDescription>
      </CardHeader>
      <CardContent className="px-6 pb-6">
        <StatusMessage status={status} />
        <form onSubmit={handleSubmit} className="space-y-3">
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
              disabled={isChanging || !username}
            >
              {isChanging ? "Changing..." : "Change password"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
