import { Check, X } from "lucide-react";

interface PasswordValidationProps {
  password: string;
}

const rules = [
  { label: "Mínimo de 8 caracteres", test: (p: string) => p.length >= 8 },
  { label: "Pelo menos 1 letra", test: (p: string) => /[a-zA-Z]/.test(p) },
  { label: "Pelo menos 1 número", test: (p: string) => /\d/.test(p) },
  { label: "Pelo menos 1 caractere especial", test: (p: string) => /[^a-zA-Z0-9]/.test(p) },
];

export const isPasswordValid = (password: string) =>
  rules.every((r) => r.test(password));

const PasswordValidation = ({ password }: PasswordValidationProps) => {
  if (!password) return null;

  return (
    <div className="space-y-1">
      {rules.map((rule) => {
        const pass = rule.test(password);
        return (
          <div key={rule.label} className="flex items-center gap-2 text-xs">
            {pass ? (
              <Check className="h-3 w-3 text-green-600" />
            ) : (
              <X className="h-3 w-3 text-destructive" />
            )}
            <span className={pass ? "text-green-600" : "text-muted-foreground"}>
              {rule.label}
            </span>
          </div>
        );
      })}
    </div>
  );
};

export default PasswordValidation;
