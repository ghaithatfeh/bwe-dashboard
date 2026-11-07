import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { isAdmin } from "@/lib/admin";
import type { Session } from "@supabase/supabase-js";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import i18n from "@/i18n";

const Auth = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    const handleSession = async (session: Session | null) => {
      if (!session) return;

      if (await isAdmin()) {
        navigate("/dashboard");
        return;
      }

      await supabase.auth.signOut();
      toast({
        variant: "destructive",
        title: i18n.t("auth.accessDenied"),
        description: i18n.t("auth.noAdminAccess"),
      });
    };

    // Also fires on subscribe (INITIAL_SESSION), covering already-logged-in users.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // Defer: calling Supabase inside this callback can deadlock the client.
      setTimeout(() => handleSession(session), 0);
    });

    return () => subscription.unsubscribe();
  }, [navigate, toast]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: t("auth.fillAllFields"),
      });
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: error.message,
      });
    }
    setLoading(false);
  };

  return (
		<div className="relative min-h-screen flex items-center justify-center bg-muted p-4">
			<LanguageSwitcher className="absolute top-4 end-4" />
			<Card className="w-full max-w-md">
				<CardHeader>
					<CardTitle className="text-2xl text-center">{t("common.appName")}</CardTitle>
					<CardDescription className="text-center">
						{t("auth.subtitle")}
					</CardDescription>
				</CardHeader>
				<CardContent>
					<form onSubmit={handleSignIn} className="space-y-4">
						<div className="space-y-2">
							<Label htmlFor="email-signin">{t("auth.email")}</Label>
							<Input
								id="email-signin"
								type="email"
								dir="ltr"
								className="rtl:text-right"
								placeholder={t("auth.emailPlaceholder")}
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								required
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="password-signin">{t("auth.password")}</Label>
							<Input
								id="password-signin"
								type="password"
								dir="ltr"
								className="rtl:text-right"
								placeholder={t("auth.passwordPlaceholder")}
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								required
							/>
						</div>
						<Button type="submit" className="w-full" disabled={loading}>
							{loading ? t("auth.signingIn") : t("auth.signIn")}
						</Button>
					</form>
				</CardContent>
			</Card>
		</div>
	);
};

export default Auth;
