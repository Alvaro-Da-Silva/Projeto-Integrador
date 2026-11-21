import { LogOutIcon } from "lucide-react"

import { useRouter } from "next/navigation"

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "../ui/button"
import { authClient } from "@/lib/auth-client"

export default function LogoutModal({
    open,
    openChange,
}: {
    open: boolean
    openChange: (open: boolean) => void
}) {

    const router = useRouter()

    return (
        <Dialog open={open} onOpenChange={openChange}>
            <DialogContent className="gap-2">
                <DialogHeader className="mt-2 mb-2 flex flex-row gap-0">
                    <div
                        aria-hidden
                        className={`mr-3 flex size-12 shrink-0 items-center justify-center rounded-full bg-destructive/10`}
                    >
                        <LogOutIcon className="text-destructive" />
                    </div>
                    <div className="flex flex-col">
                        <DialogTitle>Deseja realmente sair?</DialogTitle>
                        <DialogDescription>
                            Você precisará fazer login novamente para acessar sua conta.
                        </DialogDescription>
                    </div>
                </DialogHeader>
                <DialogFooter>
                    <Button variant="outline" title="Cancelar" onClick={() => openChange(false)}>Cancelar</Button>
                    <Button variant="destructive" title="Sair da conta" onClick={() => authClient.signOut({
                        fetchOptions: {
                            onSuccess: () => {
                                openChange(false)
                                router.push("/login")
                            }
                        }
                    })}>
                        Sair
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
