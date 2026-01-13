"use client";

import { IconLoader2,IconPlus } from "@tabler/icons-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { createShopAction } from "@/features/shops/actions";

export function CreateShopModal() {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();

    async function onSubmit(formData: FormData) {
        setLoading(true);
        const name = formData.get("name") as string;
        const description = formData.get("description") as string;
        const slug = formData.get("slug") as string;
        
        const res = await createShopAction({ name, description, slug: slug || undefined });
        

        if (res.error) {
            toast({
                title: "Erreur",
                description: res.error,
                variant: "destructive"
            });
            setLoading(false);
        } else {
            setLoading(false);
            toast({
                title: "Succès",
                description: "Le shop a été créé avec succès",
            });
            setOpen(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="bg-primary-600 hover:bg-primary-700 text-white gap-2">
                    <IconPlus size={18} />
                    Nouveau Shop
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] bg-dark-900 border-dark-800 text-gray-100">
                <DialogHeader>
                    <DialogTitle>Créer un nouveau shop</DialogTitle>
                    <DialogDescription>
                        Ajoutez un nouveau point de vente à la plateforme.
                    </DialogDescription>
                </DialogHeader>
                <form action={onSubmit} className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="name">Nom du shop</Label>
                        <Input 
                            id="name" 
                            name="name" 
                            placeholder="ex: K-Fêt" 
                            required 
                            className="bg-dark-950 border-dark-800 focus:border-primary-500"
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="slug">Slug (URL) - Optionnel</Label>
                        <Input 
                            id="slug" 
                            name="slug" 
                            placeholder="ex: k-fet" 
                            className="bg-dark-950 border-dark-800 focus:border-primary-500"
                        />
                        <p className="text-xs text-gray-500">Généré automatiquement si vide</p>
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea 
                            id="description" 
                            name="description" 
                            placeholder="Description courte du shop..." 
                            className="bg-dark-950 border-dark-800 focus:border-primary-500 resize-none"
                        />
                    </div>
                    <DialogFooter>
                        <Button 
                            type="submit" 
                            className="bg-primary-600 hover:bg-primary-700 text-white w-full sm:w-auto"
                            disabled={loading}
                        >
                            {loading && <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Créer le shop
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
