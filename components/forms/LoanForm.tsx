"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { supabase } from "@/lib/supabase/client"

const formSchema = z.object({
    clientName: z.string().min(2, "Nombre requerido"),
    amount: z.coerce.number().min(1, "Monto requerido"),
    interestRate: z.coerce.number().min(0.1, "Tasa requerida"),
    adminFeePercent: z.coerce.number().min(0).max(100).default(40),
    startDate: z.string(),
    cutoffDay: z.coerce.number().min(1).max(31),
    promissoryNote: z.string().optional(),
    promissoryNoteFile: z.any().optional(), // File input handle
})

type LoanFormValues = z.infer<typeof formSchema>

export function LoanForm() {
    const form = useForm({
        resolver: zodResolver(formSchema),
        defaultValues: {
            clientName: "",
            amount: 0,
            interestRate: 5,
            adminFeePercent: 40,
            startDate: new Date().toISOString().split('T')[0],
            cutoffDay: 15,
        },
    })

    async function onSubmit(values: LoanFormValues) {
        let fileUrl = null
        const timestamp = new Date().getTime() // Move generation here

        // Subida de archivo
        if (values.promissoryNoteFile && values.promissoryNoteFile.length > 0) {
            const file = values.promissoryNoteFile[0]
            const { data, error } = await supabase
                .storage
                .from('documents')
                .upload(`pagares/${timestamp}_${file.name}`, file)

            if (data) fileUrl = data.path
            if (error) {
                alert("Error subiendo archivo: " + error.message)
                return
            }
        }

        console.log("Creando préstamo (Simulado):", { ...values, fileUrl })
        alert("Préstamo creado (Simulado). Mira la consola.")
    }

    return (
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 p-4 border rounded-md max-w-lg bg-white shadow-sm">
            <div className="space-y-2">
                <label className="block text-sm font-medium">Nombre del Cliente</label>
                <Input {...form.register("clientName")} placeholder="Ej: Juan Perez" />
                {form.formState.errors.clientName && <span className="text-red-500 text-xs">{form.formState.errors.clientName.message}</span>}
            </div>

            <div className="flex gap-4">
                <div className="flex-1 space-y-2">
                    <label className="block text-sm font-medium">Monto</label>
                    <Input type="number" {...form.register("amount")} placeholder="1000000" />
                </div>
                <div className="flex-1 space-y-2">
                    <label className="block text-sm font-medium">Tasa Interés (%)</label>
                    <Input type="number" step="0.1" {...form.register("interestRate")} placeholder="5" />
                </div>
                <div className="flex-1 space-y-2">
                    <label className="block text-sm font-medium">Comisión Admin (%)</label>
                    <Input type="number" step="1" {...form.register("adminFeePercent")} placeholder="40" />
                </div>
            </div>

            <div className="flex gap-4">
                <div className="flex-1 space-y-2">
                    <label className="block text-sm font-medium">Fecha Inicio</label>
                    <Input type="date" {...form.register("startDate")} />
                </div>
                <div className="flex-1 space-y-2">
                    <label className="block text-sm font-medium">Día de Corte</label>
                    <Input type="number" min="1" max="31" {...form.register("cutoffDay")} />
                </div>
            </div>

            <div className="space-y-2">
                <label className="block text-sm font-medium">Pagaré Firmado (Fto/PDF)</label>
                <Input type="file" {...form.register("promissoryNoteFile")} accept="image/*,.pdf" />
                <p className="text-xs text-slate-500">Sube la foto o PDF del pagaré firmado.</p>
            </div>

            <Button type="submit" className="w-full">Registrar Préstamo</Button>
        </form >
    )
}
