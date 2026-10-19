"use client";

import Header from "@/components/Header";
import { SettingsForm } from "@/components/SettingsForm";

export default function SettingsPage() {
  return (
    <div className="min-h-screen bg-slate-900">
      <Header />
      <div className="flex justify-center pt-24 pb-12">
        <SettingsForm />
      </div>
    </div>
  );
}
