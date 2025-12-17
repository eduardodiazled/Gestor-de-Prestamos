"use client"

export const dynamic = 'force-dynamic'

import { useState, useRef, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { supabase } from "@/lib/supabase/client"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { format } from "date-fns"
import { Loader2, Upload, FileText, Check, ArrowRight, ArrowLeft, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { generatePromissoryNote } from "@/lib/pdf/generator"
import { numberToSpanish } from "@/lib/utils/numberToWords"

// Schemas
const clientSchema = z.object({
    fullName: z.string().min(3, "Nombre requerido"),
    documentId: z.string().min(5, "Cédula requerida"),
    phone: z.string().min(7, "Teléfono requerido"),
    address: z.string().min(5, "Dirección requerida"),
    city: z.string().default("La Jagua de Ibirico"),
    email: z.string().email("Email inválido").optional().or(z.literal("")),
})

const loanSchema = z.object({
    amount: z.coerce.number().min(10000, "Monto mínimo 10k"),
    interestRate: z.coerce.number().min(1, "Interés requerido"),
    startDate: z.string(),
    lenderName: z.string().default("LUIS EDUARDO DIAZ"),
    lenderId: z.string().default("1.064.118.387"),
})

function LoanWizardContent() {
    const router = useRouter()
    const [step, setStep] = useState(1)
    const [loading, setLoading] = useState(false)

    // Form States
    const clientForm = useForm({ resolver: zodResolver(clientSchema), defaultValues: { city: "La Jagua de Ibirico" } })
    const loanForm = useForm({
        resolver: zodResolver(loanSchema),
        defaultValues: {
            amount: 1000000,
            interestRate: 20,
            startDate: new Date().toISOString().split('T')[0],
            lenderName: "LUIS EDUARDO DIAZ",
            lenderId: "1.064.118.387"
        }
    })

    // Files
    const [idFile, setIdFile] = useState<File | null>(null)
    const [signedNoteFile, setSignedNoteFile] = useState<File | null>(null)
    const [transferFile, setTransferFile] = useState<File | null>(null)

    // Data Holders
    const [clientData, setClientData] = useState<any>(null)

    // Refs for file inputs
    const noteInputRef = useRef<HTMLInputElement>(null)
    const transferInputRef = useRef<HTMLInputElement>(null)

    // Draft Management
    const searchParams = useSearchParams()
    const draftId = searchParams.get('id') // Load draft if URL has ?id=...

    useEffect(() => {
        if (!draftId) return

        async function loadDraft() {
            setLoading(true)
            const { data, error } = await supabase.from('loan_applications').select('*').eq('id', draftId).single()
            if (error) {
                console.error("Error loading draft", error)
            } else if (data) {
                // Populate Forms
                const savedData = data.data
                if (savedData.client) clientForm.reset(savedData.client)
                if (savedData.loan) loanForm.reset(savedData.loan)
                setClientData(savedData.client) // Restore client data for next steps
                setStep(data.step || 1)
            }
            setLoading(false)
        }
        loadDraft()
    }, [draftId])

    const saveDraft = async (newStep: number, collectedData: any = {}) => {
        // Prepare payload merging current form values
        const payload = {
            client: { ...clientForm.getValues(), ...collectedData.client },
            loan: { ...loanForm.getValues(), ...collectedData.loan }
        }

        const user = (await supabase.auth.getUser()).data.user
        if (!user) return

        if (draftId) {
            // Update existing
            await supabase.from('loan_applications').update({
                step: newStep,
                data: payload
            }).eq('id', draftId)
        } else {
            // Create new (ONLY IF WE ARE PAST STEP 1 or explicitly causing save)
            // Strategy: Create draft immediately on Step 1 completion
            const { data, error } = await supabase.from('loan_applications').insert({
                user_id: user.id,
                step: newStep,
                data: payload
            }).select('id').single()

            if (data && !draftId) {
                // Update URL silently without reload
                const newUrl = `/dashboard/loans/new?id=${data.id}`
                window.history.replaceState({ ...window.history.state, as: newUrl, url: newUrl }, '', newUrl)
            }
        }
    }

    // --- STEP ACTIONS ---

    const handleStep1 = async (data: any) => {
        if (!idFile && !draftId) { // Allow skipping file upload if reloading draft? No, file inputs clear on reload. 
            // Better to force re-upload or check if we stored file metadata. For now, force re-upload if logic strict, or lenient.
            // Assumption: Files are ephemeral. Re-upload needed.
            alert("Debes subir la foto de la Cédula (Si es borrador, súbela de nuevo)")
            return
        }
        setClientData(data)
        setStep(2)
        saveDraft(2, { client: data })
    }

    const handleGeneratePDF = () => {
        const cValues = clientForm.getValues()
        const lValues = loanForm.getValues()

        // Fix Types: Ensure amount is treated as number
        const amountVal = Number(lValues.amount) || 0
        const amountText = numberToSpanish(amountVal)

        generatePromissoryNote({
            number: "___",
            amount: amountVal,
            amountText: amountText,
            city: String(cValues.city || ''),
            date: format(new Date(), 'd de MMMM de yyyy'),
            clientName: String(cValues.fullName || ''),
            clientId: String(cValues.documentId || ''),
            clientAddress: String(cValues.address || ''),
            clientCity: String(cValues.city || ''),
            lenderName: String(lValues.lenderName || ''),
            lenderId: String(lValues.lenderId || ''),
            interestRate: Number(lValues.interestRate) || 0,
            startDate: String(lValues.startDate || '')
        })
    }

    const handleFinalSubmit = async () => {
        if (!signedNoteFile || !transferFile) {
            alert("Falta subir el Pagaré Firmado o el Comprobante de Desembolso")
            return
        }

        setLoading(true)
        try {
            // ... (rest of logic same)
            // 1. Validate User & Profile (Self-healing)
            const { data: { user }, error: userError } = await supabase.auth.getUser()
            if (userError || !user) throw new Error("No estás autenticado. Por favor inicia sesión.")

            // Check if profile exists, if not create it (Admin safeguard)
            let { data: profile } = await supabase.from('profiles').select('id').eq('id', user.id).single()
            if (!profile) {
                const { error: profileError } = await supabase.from('profiles').insert({
                    id: user.id,
                    email: user.email,
                    full_name: 'Admin User', // Default name
                    role: 'admin'
                })
                if (profileError) console.error("Error auto-creating profile:", profileError)
                // Proceed anyway, might fail FK if insert failed, but we tried.
            }

            // 2. Create or Get Client (by Document ID)
            // Check existence
            let { data: existingClient } = await supabase
                .from('clients')
                .select('id')
                .eq('document_id', clientData.documentId)
                .single()

            let clientId = existingClient?.id

            if (!clientId) {
                const { data: newClient, error: clientError } = await supabase
                    .from('clients')
                    .insert({
                        full_name: clientData.fullName,
                        document_id: clientData.documentId,
                        phone: clientData.phone,
                        address: clientData.address,
                        email: clientData.email
                    })
                    .select()
                    .single()

                if (clientError) throw clientError
                clientId = newClient.id
            }

            // 3. Upload Files
            const timestamp = Date.now()

            // ID
            const idExt = idFile?.name.split('.').pop()
            const idPath = `clients/${clientId}_id_${timestamp}.${idExt}`
            await supabase.storage.from('documents').upload(idPath, idFile!)
            const idUrl = supabase.storage.from('documents').getPublicUrl(idPath).data.publicUrl

            // Signed Note
            const noteExt = signedNoteFile?.name.split('.').pop()
            const notePath = `loans/${clientId}_note_${timestamp}.${noteExt}`
            await supabase.storage.from('documents').upload(notePath, signedNoteFile!)
            const noteUrl = supabase.storage.from('documents').getPublicUrl(notePath).data.publicUrl

            // Transfer Proof
            const transfExt = transferFile?.name.split('.').pop()
            const transfPath = `loans/${clientId}_transfer_${timestamp}.${transfExt}`
            await supabase.storage.from('documents').upload(transfPath, transferFile!)
            const transfUrl = supabase.storage.from('documents').getPublicUrl(transfPath).data.publicUrl

            // 4. Create Loan
            const lValues = loanForm.getValues()
            const { error: loanError } = await supabase.from('loans').insert({
                client_id: clientId,
                investor_id: user.id, // Explicitly use fetched user ID
                amount: lValues.amount,
                interest_rate: lValues.interestRate,
                start_date: lValues.startDate,
                cutoff_day: new Date(lValues.startDate).getDate(), // UTC issue might persist, but acceptable for now
                status: 'active',
                promissory_note_url: noteUrl,
                transfer_proof_url: transfUrl,
                paid_until: lValues.startDate
            })

            if (loanError) throw loanError

            // 5. Delete Draft if exists
            if (draftId) {
                await supabase.from('loan_applications').delete().eq('id', draftId)
            }

            alert("Préstamo Creado Exitosamente")
            router.push('/dashboard')

        } catch (error: any) {
            console.error(error)
            alert("Error: " + error.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="max-w-3xl mx-auto p-6 space-y-8">
            {/* Progress Bar */}
            <div className="flex justify-between mb-8 relative">
                <div className="absolute top-1/2 left-0 w-full h-1 bg-slate-200 -z-10"></div>

                {[1, 2, 3].map((s) => (
                    <div key={s} className={`flex items-center justify-center w-10 h-10 rounded-full font-bold ${step >= s ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
                        {s}
                    </div>
                ))}
            </div>

            {/* STEP 1: CLIENT DATA */}
            {step === 1 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Paso 1: Datos del Cliente</CardTitle>
                        <CardDescription>Información personal y documentos de identidad.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Nombre Completo</label>
                                <Input {...clientForm.register("fullName")} placeholder="Ej: Julio Diaz" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Cédula</label>
                                <Input {...clientForm.register("documentId")} placeholder="123456789" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Celular</label>
                                <Input {...clientForm.register("phone")} placeholder="300..." />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Ciudad</label>
                                <Input {...clientForm.register("city")} />
                            </div>
                            <div className="md:col-span-2 space-y-2">
                                <label className="text-sm font-medium">Dirección</label>
                                <Input {...clientForm.register("address")} />
                            </div>
                        </div>

                        <div className="border-2 border-dashed border-slate-200 rounded-lg p-6 flex flex-col items-center justify-center text-slate-500 bg-slate-50 mt-4">
                            <FileText className="h-8 w-8 mb-2" />
                            <p className="text-sm font-medium mb-2">Foto de Cédula</p>
                            <input
                                type="file"
                                onChange={(e) => setIdFile(e.target.files?.[0] || null)}
                                className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                            />
                            {idFile && <p className="text-green-600 text-xs mt-2">Archivo seleccionado: {idFile.name}</p>}
                        </div>

                        <div className="flex justify-end pt-4">
                            <Button onClick={clientForm.handleSubmit(handleStep1)}>
                                Siguiente <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* STEP 2: LOAN DATA & PAGARÉ */}
            {step === 2 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Paso 2: Configurar Préstamo</CardTitle>
                        <CardDescription>Define el dinero y genera los documentos legales.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-lg border">
                            <div>
                                <label className="text-xs text-slate-500 uppercase font-bold">Acreedor</label>
                                <Input {...loanForm.register("lenderName")} className="mt-1" />
                            </div>
                            <div>
                                <label className="text-xs text-slate-500 uppercase font-bold">C.C. Acreedor</label>
                                <Input {...loanForm.register("lenderId")} className="mt-1" />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Monto a Prestar</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-2.5 text-slate-500">$</span>
                                    <Input type="number" {...loanForm.register("amount")} className="pl-6 font-bold text-lg" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Tasa Interés (%)</label>
                                <Input type="number" {...loanForm.register("interestRate")} />
                                <p className="text-xs text-slate-400">Mensual (Se dejará en blanco en el PDF)</p>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Fecha Inicio</label>
                                <Input type="date" {...loanForm.register("startDate")} />
                            </div>
                        </div>

                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center justify-between">
                            <div>
                                <h4 className="font-bold text-blue-900">Generar Pagaré</h4>
                                <p className="text-sm text-blue-700">Descarga el PDF para imprimir y firmar.</p>
                            </div>
                            <Button onClick={handleGeneratePDF} variant="outline" className="border-blue-300 text-blue-700 bg-white hover:bg-blue-50">
                                <Download className="mr-2 h-4 w-4" /> Descargar PDF
                            </Button>
                        </div>

                        <div className="flex justify-between pt-4">
                            <Button variant="ghost" onClick={() => setStep(1)}>
                                <ArrowLeft className="mr-2 h-4 w-4" /> Volver
                            </Button>
                            <Button onClick={() => setStep(3)}>
                                Ya lo tengo firmado <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* STEP 3: UPLOAD & CONFIRM */}
            {step === 3 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Paso 3: Formalización</CardTitle>
                        <CardDescription>Sube los documentos firmados y el comprobante de la transferencia.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Signed Note */}
                            <div className="space-y-2">
                                <div
                                    onClick={() => noteInputRef.current?.click()}
                                    className="border-2 border-dashed border-slate-300 rounded-lg p-6 hover:bg-slate-50 transition-colors text-center cursor-pointer relative"
                                >
                                    <input
                                        ref={noteInputRef}
                                        type="file"
                                        className="hidden"
                                        onChange={(e) => setSignedNoteFile(e.target.files?.[0] || null)}
                                    />
                                    <FileText className={`h-10 w-10 mb-2 mx-auto ${signedNoteFile ? 'text-green-600' : 'text-slate-400'}`} />
                                    <p className="font-medium text-slate-900">Pagaré Firmado</p>
                                    <p className="text-xs text-slate-500 mt-1">{signedNoteFile ? signedNoteFile.name : "Click aquí para subir foto o PDF"}</p>
                                </div>
                            </div>

                            {/* Transfer Proof */}
                            <div className="space-y-2">
                                <div
                                    onClick={() => transferInputRef.current?.click()}
                                    className="border-2 border-dashed border-slate-300 rounded-lg p-6 hover:bg-slate-50 transition-colors text-center cursor-pointer relative"
                                >
                                    <input
                                        ref={transferInputRef}
                                        type="file"
                                        className="hidden"
                                        onChange={(e) => setTransferFile(e.target.files?.[0] || null)}
                                    />
                                    <Upload className={`h-10 w-10 mb-2 mx-auto ${transferFile ? 'text-green-600' : 'text-slate-400'}`} />
                                    <p className="font-medium text-slate-900">Comprobante Desembolso</p>
                                    <p className="text-xs text-slate-500 mt-1">{transferFile ? transferFile.name : "Click aquí para subir foto o PDF"}</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-yellow-50 p-4 rounded text-sm text-yellow-800 flex items-start gap-2">
                            <Check className="h-5 w-5 mt-0.5" />
                            <p>Al finalizar, se creará el cliente (si es nuevo), el préstamo activo iniciando hoy, y se guardarán los 3 documentos en la nube.</p>
                        </div>

                        <div className="flex justify-between pt-4">
                            <Button variant="ghost" onClick={() => setStep(2)}>
                                <ArrowLeft className="mr-2 h-4 w-4" /> Volver
                            </Button>
                            <Button
                                onClick={handleFinalSubmit}
                                className="bg-green-600 hover:bg-green-700 text-white w-full md:w-auto"
                                disabled={loading}
                            >
                                {loading ? <Loader2 className="animate-spin mr-2" /> : null}
                                Finalizar y Desembolsar
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}

export default function NewLoanPage() {
    return (
        <Suspense fallback={<div className="p-8 text-center"><Loader2 className="animate-spin mx-auto h-8 w-8" /><p>Cargando asistente...</p></div>}>
            <LoanWizardContent />
        </Suspense>
    )
}
