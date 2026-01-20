"use client";

import { jsPDF } from "jspdf";
import { AlertCircle, Camera, Loader2, Plus, Upload, X } from "lucide-react";
import { useRef, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { uploadInvoiceToPennyLane } from "@/features/shops/pennylane-actions";
import { cn } from "@/lib/utils";

export function ManualInvoiceForm({
	suppliers,
	slug,
}: {
	suppliers: { id: string; name: string }[];
	slug: string;
}) {
	const { toast } = useToast();
	const [images, setImages] = useState<string[]>([]);
	const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
	const [isPending, startTransition] = useTransition();

	const [error, setError] = useState<string | null>(null);
	const [formErrors, setFormErrors] = useState<Record<string, string>>({});

	const fileInputRef = useRef<HTMLInputElement>(null);
	const formRef = useRef<HTMLFormElement>(null);

	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		if (e.target.files && e.target.files.length > 0) {
			const newImages: string[] = [];
			Array.from(e.target.files).forEach((file) => {
				const url = URL.createObjectURL(file);
				newImages.push(url);
			});
			setImages((prev) => [...prev, ...newImages]);
			// Reset input so same file can be selected again if needed
			e.target.value = "";
		}
	};

	const removeImage = (index: number) => {
		setImages((prev) => {
			const newImages = [...prev];
			URL.revokeObjectURL(newImages[index]); // Cleanup
			newImages.splice(index, 1);
			return newImages;
		});
	};

	const triggerCamera = () => {
		fileInputRef.current?.click();
	};

	const validateForm = (formData: FormData) => {
		const errors: Record<string, string> = {};
		const supplierId = formData.get("supplier_id") as string;
		const date = formData.get("date") as string;
		const amount = formData.get("amount") as string;

		if (!supplierId) errors.supplier_id = "Le fournisseur est requis";
		if (!date) errors.date = "La date est requise";
		if (!amount) errors.amount = "Le montant est requis";
		if (images.length === 0)
			errors.images = "Veuillez prendre au moins une photo";

		setFormErrors(errors);
		return Object.keys(errors).length === 0;
	};

	const handleSubmit = async (formData: FormData) => {
		setError(null);
		setFormErrors({});

		if (!validateForm(formData)) {
			toast({
				variant: "destructive",
				title: "Erreur de validation",
				description: "Veuillez vérifier les champs du formulaire",
			});
			return;
		}

		setIsGeneratingPdf(true);
		try {
			const pdf = new jsPDF();

			for (let i = 0; i < images.length; i++) {
				if (i > 0) pdf.addPage();

				const img = new Image();
				img.src = images[i];
				await new Promise((resolve) => {
					img.onload = resolve;
				});

				// Calculate dimensions to fit A4
				const imgProps = pdf.getImageProperties(img);
				const pdfWidth = pdf.internal.pageSize.getWidth();
				const pdfHeight = pdf.internal.pageSize.getHeight();
				const imgWidth = imgProps.width;
				const imgHeight = imgProps.height;

				const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
				const width = imgWidth * ratio;
				const height = imgHeight * ratio;

				// Center image
				const x = (pdfWidth - width) / 2;
				const y = (pdfHeight - height) / 2;

				pdf.addImage(img, "JPEG", x, y, width, height);
			}

			const pdfBlob = pdf.output("blob");

			// Create new FormData with the PDF
			const submissionData = new FormData();
			const supplierId = formData.get("supplier_id") as string;
			const supplierName =
				suppliers.find((s) => s.id === supplierId)?.name || "Inconnu";

			submissionData.append("file", pdfBlob, "invoice.pdf");
			submissionData.append("supplier_id", supplierId);
			submissionData.append("supplier_name", supplierName);
			submissionData.append("date", formData.get("date") as string);
			submissionData.append("amount", formData.get("amount") as string);
			submissionData.append("slug", slug);

			startTransition(async () => {
				const result = await uploadInvoiceToPennyLane({}, submissionData);
				if (result?.error) {
					console.error("Pennylane Action Error:", result.error);
					setError(result.error);
					toast({
						variant: "destructive",
						title: "Erreur",
						description: result.error,
					});
				} else {
					toast({
						title: "Succès",
						description: "Facture envoyée à Pennylane",
					});
					// Reset form
					setImages([]);
					formRef.current?.reset();
					setFormErrors({});
				}
			});
		} catch (error: any) {
			console.error("PDF Generation failed:", error);
			setError(error.message || "Erreur lors de la génération du PDF");
			toast({
				variant: "destructive",
				title: "Erreur interne",
				description: "Erreur lors de la génération du PDF",
			});
		} finally {
			setIsGeneratingPdf(false);
		}
	};

	return (
		<Card className="w-full max-w-md mx-auto border-dark-800 bg-dark-900 shadow-xl">
			<CardHeader>
				<CardTitle className="text-xl text-center">
					Ajouter une facture
				</CardTitle>
			</CardHeader>
			<CardContent>
				<form action={handleSubmit} ref={formRef} className="space-y-6">
					{error && (
						<div className="bg-red-500/10 border border-red-500/50 text-red-500 px-4 py-3 rounded-md flex items-center gap-3 text-sm">
							<AlertCircle className="h-5 w-5 flex-shrink-0" />
							<span>{error}</span>
						</div>
					)}

					{/* Image Capture Area */}
					<div className="space-y-3">
						<Label className={cn(formErrors.images && "text-red-500")}>
							Photos de la facture
						</Label>

						<div className="grid grid-cols-2 gap-3">
							{images.map((img, idx) => (
								<div
									key={idx}
									className="relative aspect-[3/4] rounded-lg overflow-hidden border border-dark-700 bg-black group"
								>
									<img
										src={img}
										alt={`Page ${idx + 1}`}
										className="w-full h-full object-cover"
									/>
									<button
										type="button"
										onClick={() => removeImage(idx)}
										className="absolute top-2 right-2 p-1.5 bg-black/60 text-white rounded-full transition-colors hover:bg-red-500"
									>
										<X size={14} />
									</button>
									<div className="absolute bottom-2 right-2 px-2 py-0.5 bg-black/60 text-white text-[10px] uppercase font-bold tracking-wider rounded">
										Page {idx + 1}
									</div>
								</div>
							))}

							<div
								onClick={triggerCamera}
								className={cn(
									"aspect-[3/4] border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer transition-all active:scale-95 touch-manipulation",
									formErrors.images
										? "border-red-500/50 bg-red-500/5 hover:bg-red-500/10"
										: "border-dark-600 bg-dark-800/50 hover:bg-dark-800 hover:border-primary-500/50 hover:text-primary-400 text-gray-400"
								)}
							>
								<Camera className="w-8 h-8 mb-2" />
								<span className="text-sm font-medium">Ajouter une page</span>
							</div>
						</div>
						{formErrors.images && (
							<p className="text-xs text-red-500 font-medium">
								{formErrors.images}
							</p>
						)}

						<input
							ref={fileInputRef}
							type="file"
							accept="image/*"
							capture="environment"
							className="hidden"
							onChange={handleFileChange}
						/>
					</div>

					{/* Manual Fields */}
					<div className="grid gap-5">
						<div className="space-y-2">
							<Label
								htmlFor="supplier_id"
								className={cn(formErrors.supplier_id && "text-red-500")}
							>
								Fournisseur
							</Label>
							<select
								id="supplier_id"
								name="supplier_id"
								className={cn(
									"flex h-11 w-full rounded-lg border bg-dark-950 px-3 py-2 text-sm text-white ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-colors",
									formErrors.supplier_id
										? "border-red-500 focus-visible:ring-red-500"
										: "border-dark-700 hover:border-dark-600 focus-visible:border-primary-600"
								)}
								defaultValue=""
							>
								<option value="" disabled>
									Sélectionner un fournisseur
								</option>
								{suppliers.map((s) => (
									<option key={s.id} value={s.id}>
										{s.name}
									</option>
								))}
							</select>
							{formErrors.supplier_id && (
								<p className="text-xs text-red-500 font-medium">
									{formErrors.supplier_id}
								</p>
							)}
						</div>

						<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
							<div className="space-y-2">
								<Label
									htmlFor="date"
									className={cn(formErrors.date && "text-red-500")}
								>
									Date
								</Label>
								<Input
									id="date"
									name="date"
									type="date"
									className={cn(formErrors.date && "border-red-500")}
								/>
								{formErrors.date && (
									<p className="text-xs text-red-500 font-medium">
										{formErrors.date}
									</p>
								)}
							</div>
							<div className="space-y-2">
								<Label
									htmlFor="amount"
									className={cn(formErrors.amount && "text-red-500")}
								>
									Montant TTC (€)
								</Label>
								<Input
									id="amount"
									name="amount"
									type="number"
									step="0.01"
									placeholder="0.00"
									className={cn(formErrors.amount && "border-red-500")}
								/>
								{formErrors.amount && (
									<p className="text-xs text-red-500 font-medium">
										{formErrors.amount}
									</p>
								)}
							</div>
						</div>
					</div>

					<Button
						type="submit"
						className="w-full h-11 text-base font-medium"
						disabled={isPending || isGeneratingPdf}
					>
						{(isPending || isGeneratingPdf) && (
							<Loader2 className="mr-2 h-5 w-5 animate-spin" />
						)}
						{isGeneratingPdf
							? "Génération PDF..."
							: isPending
								? "Envoi en cours..."
								: "Envoyer vers PennyLane"}
					</Button>
				</form>
			</CardContent>
		</Card>
	);
}
