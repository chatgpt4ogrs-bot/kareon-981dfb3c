import { useEffect, useState } from "react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { MIN_REASON_LENGTH } from "@/lib/audit";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  /** Nome do item, exibido em destaque */
  itemName?: string | null;
  description?: string;
  confirmLabel?: string;
  /** Recebe o motivo; se lançar erro, o popup continua aberto. */
  onConfirm: (reason: string) => Promise<void> | void;
}

const ConfirmDeleteDialog = ({
  open,
  onOpenChange,
  title,
  itemName,
  description = "Esta ação não pode ser desfeita.",
  confirmLabel = "Excluir",
  onConfirm,
}: Props) => {
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (open) {
      setReason("");
      setPending(false);
    }
  }, [open]);

  const valid = reason.trim().length >= MIN_REASON_LENGTH;

  const handleConfirm = async () => {
    if (!valid || pending) return;
    setPending(true);
    try {
      await onConfirm(reason.trim());
      onOpenChange(false);
    } catch {
      // quem chama exibe o erro
    } finally {
      setPending(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={(o) => !pending && onOpenChange(o)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>
            {itemName && <><strong className="text-foreground">{itemName}</strong> será excluído. </>}
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-1.5">
          <Label htmlFor="delete-reason">Motivo da exclusão *</Label>
          <Textarea
            id="delete-reason"
            autoFocus
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Descreva por que este registro está sendo excluído"
            disabled={pending}
          />
          <p className="text-xs text-muted-foreground">
            O motivo fica registrado na auditoria do Painel administrativo.
          </p>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancelar</AlertDialogCancel>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={!valid || pending}
            className="gap-2"
          >
            {pending && <Loader2 className="w-4 h-4 animate-spin" />}
            {pending ? "Excluindo..." : confirmLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default ConfirmDeleteDialog;
