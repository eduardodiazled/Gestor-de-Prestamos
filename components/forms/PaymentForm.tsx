import { useState } from "react"
import { supabase } from "@/lib/supabase/client"
import { Loader2, Upload, Cloud } from "lucide-react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { generatePaymentReceipt } from "@/lib/pdf/generator"

// Schema
const formSchema = z.object({
    loanId: z.string().min(1, "Préstamo requerido"),
    amount: z.coerce.number().min(1, "Monto requerido"),
    date: z.string(),
    type: z.enum(["interest", "capital", "fee"]),
    notes: z.string().optional(),
    waiveFee: z.boolean().default(false),
})

type PaymentFormValues = z.infer<typeof formSchema>

interface PaymentFormProps {
    loanId?: string
    clientName?: string
    suggestedAmount?: number
    onSuccess?: () => void
}

export function PaymentForm({ loanId, clientName, suggestedAmount, onSuccess }: PaymentFormProps) {
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [proofFile, setProofFile] = useState<File | null>(null)

    const form = useForm<PaymentFormValues>({
        // @ts-ignore
        resolver: zodResolver(formSchema),
        defaultValues: {
            loanId: loanId || "",
            amount: suggestedAmount || 0,
            date: new Date().toISOString().split('T')[0],
            type: "interest",
            notes: "",
            waiveFee: false
        },
    })

    async function onSubmit(values: PaymentFormValues) {
        setIsSubmitting(true)

        try {
            let proofUrl = null

            // 1. Upload File if present
            if (proofFile) {
                const fileExt = proofFile.name.split('.').pop()
                const fileName = `${values.loanId}_${Date.now()}.${fileExt}`
                const { data: uploadData, error: uploadError } = await supabase.storage
                    .from('documents')
                    .upload(`payments/${fileName}`, proofFile)

                if (uploadError) {
                    throw new Error("Error subiendo comprobante: " + uploadError.message)
                }

                // Get Public URL
                const { data: publicUrlData } = supabase.storage
                    .from('documents')
                    .getPublicUrl(`payments/${fileName}`)

                proofUrl = publicUrlData.publicUrl
            }

            // 2. Save to Supabase
            const { data, error } = await supabase.from('payments').insert({
                loan_id: values.loanId,
                amount: values.amount,
                payment_date: values.date,
                payment_type: values.type,
                notes: values.notes,
                late_fee_waived: values.waiveFee,
                proof_url: proofUrl,
                is_late: false
            }).select().single()

            if (error) throw error

            // 3. Update Loan Status to 'active' (Al día)
            const { error: loanError } = await supabase
                .from('loans')
                .update({ status: 'active' })
                .eq('id', values.loanId)

            if (loanError) console.error("Error updating loan status:", loanError)

            // 3. Generate PDF
            generatePaymentReceipt({
                id: data.id,
                date: values.date,
                amount: values.amount,
                clientName: clientName || "Cliente",
                concept: values.type
            })

            alert("Pago registrado, Comprobante subido y Recibo descargado.")
            if (onSuccess) onSuccess()
        } catch (error: any) {
            console.error("Error creating payment:", error)
            alert("Error: " + error.message)
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
                <label className="block text-sm font-medium">Cliente / Préstamo</label>
                <Input
                    {...form.register("loanId")}
                    value={loanId}
                    readOnly={!!loanId}
                    className={loanId ? "bg-slate-100 text-slate-500" : ""}
                />
            </div>

            <div className="flex gap-4">
                <div className="flex-1 space-y-2">
                    <label className="block text-sm font-medium">Monto</label>
                    <Input type="number" {...form.register("amount")} />
                </div>
                <div className="flex-1 space-y-2">
                    <label className="block text-sm font-medium">Fecha</label>
                    <Input type="date" {...form.register("date")} />
                </div>
            </div>

            <div className="space-y-2">
                <label className="block text-sm font-medium">Tipo de Pago</label>
                <select {...form.register("type")} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                    <option value="interest">Interés</option>
                    <option value="capital">Abono a Capital</option>
                    <option value="fee">Pago de Mora</option>
                </select>
            </div>

            <div className="flex items-center space-x-2 py-2">
                <Checkbox
                    id="waive"
                    onCheckedChange={(checked) => form.setValue("waiveFee", checked as boolean)}
                />
                <label
                    htmlFor="waive"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                    Perdonar Mora (No generar multa)
                </label>
            </div>

            <div className="space-y-2 border-dashed border-2 border-slate-200 rounded-lg p-4 bg-slate-50 text-center">
                <label className="block text-sm font-medium mb-1 cursor-pointer">
                    {proofFile ? (
                        <span className="text-green-600 flex items-center justify-center gap-2">
                            <Cloud className="w-4 h-4" /> Comprobante: {proofFile.name}
                        </span>
                    ) : (
                        <span className="text-slate-500 flex items-center justify-center gap-2">
                            <Upload className="w-4 h-4" /> Adjuntar Foto del Pago
                        </span>
                    )}
                    <input
                        type="file"
                        accept="image/*,application/pdf"
                        className="hidden"
                        onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                                setProofFile(e.target.files[0])
                            }
                        }}
                    />
                </label>
            </div>

            <div className="space-y-2">
                <label className="block text-sm font-medium">Notas</label>
                <Input {...form.register("notes")} placeholder="Ej: Transferencia Bancolombia" />
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : null}
                Registrar Pago
            </Button>
        </form>
    )
}
