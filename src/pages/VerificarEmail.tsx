import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Mail } from "lucide-react";

const VerificarEmail = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const email = (location.state as any)?.email || "";
  const [code, setCode] = useState("");
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const handleVerify = async () => {
    if (code.length !== 6) {
      setErro("Insira o código de 6 dígitos");
      return;
    }
    setErro("");
    setLoading(true);

    try {
      const { error } = await supabase.auth.verifyOtp({
        email,
        token: code,
        type: "signup",
      });
      if (error) {
        setErro(error.message);
      } else {
        navigate("/");
      }
    } catch {
      setErro("Erro ao verificar código");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email,
      });
      if (error) setErro(error.message);
    } catch {
      setErro("Erro ao reenviar código");
    } finally {
      setResending(false);
    }
  };

  if (!email) {
    navigate("/cadastro");
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
            <Mail className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Verificar email</h1>
          <p className="text-muted-foreground">
            Enviamos um código de 6 dígitos para <strong>{email}</strong>
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Código de verificação</CardTitle>
            <CardDescription>Digite o código recebido no seu email</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-center">
              <InputOTP maxLength={6} value={code} onChange={setCode}>
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                </InputOTPGroup>
                <InputOTPGroup>
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
            </div>

            {erro && <p className="text-sm text-destructive text-center">{erro}</p>}

            <Button onClick={handleVerify} className="w-full" disabled={loading || code.length !== 6}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Verificar
            </Button>

            <p className="text-sm text-muted-foreground text-center">
              Não recebeu?{" "}
              <button
                type="button"
                onClick={handleResend}
                disabled={resending}
                className="text-primary hover:underline disabled:opacity-50"
              >
                {resending ? "Enviando..." : "Reenviar código"}
              </button>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default VerificarEmail;
