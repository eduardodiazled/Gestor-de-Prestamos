"use client"

import { useEffect, useState, useRef } from "react"
import { useParams, useRouter } from "next/navigation" // Corrected import for App Router
import { supabase } from "@/lib/supabase/client"
import { format } from "date-fns"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Loader2, FileText, ArrowLeft, Download, Upload, CheckCircle } from "lucide-react"
import { generatePazYSalvo } from "@/lib/pdf/generator"

export default function LoanDetailsPage() {
    const params = useParams()
    const router = useRouter()
    const id = params.id as string

    const [loan, setLoan] = useState<any>(null)
    const [payments, setPayments] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function loadDetails() {
            if (!id) return

            // 1. Fetch Loan + Client + Investor
            const { data: loanData, error: loanError } = await supabase
                .from('loans')
                .select('*, client:clients(*), investor:profiles(*)')
                .eq('id', id)
                .single()

            if (loanError) {
                console.error("Error fetching loan:", loanError)
                return
            }

            // 2. Fetch Payments
            const { data: paymentData, error: paymentError } = await supabase
                .from('payments')
                .select('*')
                .eq('loan_id', id)
                .order('payment_date', { ascending: false })

            setLoan(loanData)
            setPayments(paymentData || [])
            setLoading(false)
        }

        loadDetails()
    }, [id])

    // Upload Handlers
    // Upload Handlers
    const idInputRef = useRef<HTMLInputElement>(null)
    const noteInputRef = useRef<HTMLInputElement>(null)
    const transferInputRef = useRef<HTMLInputElement>(null)

    const handleUpload = async (file: File, type: 'note' | 'transfer' | 'id_card') => {
        if (!file || !loan) return

        setLoading(true)
        try {
            const timestamp = Date.now()
            const ext = file.name.split('.').pop()

            // Define Path
            let path = ''
            if (type === 'id_card') {
                path = `clients/${loan.client_id}_id_${timestamp}.${ext}`
            } else {
                path = `loans/${loan.client_id}_${type}_${timestamp}.${ext}`
            }

            // 1. Upload
            const { error: uploadError } = await supabase.storage.from('documents').upload(path, file)
            if (uploadError) throw uploadError

            const publicUrl = supabase.storage.from('documents').getPublicUrl(path).data.publicUrl

            // 2. Update Database
            if (type === 'id_card') {
                const { error: dbError } = await supabase
                    .from('clients')
                    .update({ id_photo_url: publicUrl })
                    .eq('id', loan.client_id)
                if (dbError) throw dbError
            } else {
                const updateField = type === 'note' ? 'promissory_note_url' : 'transfer_proof_url'
                const { error: dbError } = await supabase
                    .from('loans')
                    .update({ [updateField]: publicUrl })
                    .eq('id', loan.id)
                if (dbError) throw dbError
            }

            // 3. Reload
            window.location.reload()

        } catch (error: any) {
            console.error(error)
            alert("Error al subir archivo: " + error.message)
            setLoading(false)
        }
    }

    if (loading) return <div className="p-8 text-center flex justify-center"><Loader2 className="animate-spin" /></div>

    if (!loan) return <div className="p-8 text-center">Préstamo no encontrado</div>

    return (
        <div className="p-4 space-y-6 max-w-4xl mx-auto">
            {/* Hidden Inputs */}
            <input
                type="file"
                ref={idInputRef}
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0], 'id_card')}
            />
            <input
                type="file"
                ref={noteInputRef}
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0], 'note')}
            />
            <input
                type="file"
                ref={transferInputRef}
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0], 'transfer')}
            />

            <Button variant="ghost" onClick={() => router.back()} className="mb-4">
                <ArrowLeft className="mr-2 h-4 w-4" /> Volver al Dashboard
            </Button>

            {/* Header / Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Detalles del Préstamo</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <div className="text-2xl font-bold">{loan.client?.full_name}</div>
                        <div className="text-sm text-slate-500">ID: {loan.client?.document_id || 'N/A'}</div>
                        <div className="flex bg-slate-100 p-2 rounded justify-between mt-4">
                            <span>Capital Prestado:</span>
                            <span className="font-bold">${Number(loan.amount).toLocaleString()}</span>
                        </div>
                        <div className="flex bg-slate-100 p-2 rounded justify-between">
                            <span>Tasa Interés:</span>
                            <span className="font-bold">{loan.interest_rate}% Mensual</span>
                        </div>
                        <div className="flex bg-slate-100 p-2 rounded justify-between text-blue-700 bg-blue-50 border border-blue-100">
                            <span>Pagado Hasta:</span>
                            <span className="font-bold">{loan.paid_until ? format(new Date(loan.paid_until), 'dd/MM/yyyy') : 'Pendiente'}</span>
                        </div>

                        {/* Paz y Salvo Button */}
                        {(loan.status === 'paid' || loan.status === 'completed') && (
                            <div className="pt-4">
                                <Button
                                    className="w-full bg-green-600 hover:bg-green-700 text-white"
                                    onClick={() => generatePazYSalvo({
                                        clientName: loan.client?.full_name || '',
                                        clientId: loan.client?.document_id || '',
                                        loanAmount: Number(loan.amount),
                                        startDate: format(new Date(loan.start_date), 'dd/MM/yyyy'),
                                        endDate: format(new Date(), 'dd/MM/yyyy'), // Today as issuance date
                                        city: loan.client?.address?.split(',')?.[1] || 'La Jagua de Ibirico' // Fallback logic
                                    })}
                                >
                                    <CheckCircle className="mr-2 h-4 w-4" /> Generar Paz y Salvo
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Documentación</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* ID Card (Cédula) */}
                        <div className="flex items-center justify-between border p-3 rounded-lg">
                            <div className="flex items-center gap-3">
                                <FileText className="text-slate-400" />
                                <div>
                                    <p className="font-medium text-sm">Cédula / ID</p>
                                    <p className="text-xs text-slate-400">{loan.client?.id_photo_url ? "Disponible" : "Pendiente"}</p>
                                </div>
                            </div>
                            {loan.client?.id_photo_url ? (
                                <div className="flex gap-2">
                                    <a href={loan.client.id_photo_url} target="_blank" rel="noopener noreferrer">
                                        <Button size="sm" variant="outline"><Download className="h-4 w-4" /></Button>
                                    </a>
                                    <Button size="sm" variant="ghost" onClick={() => idInputRef.current?.click()} className="text-xs text-blue-600">Cambiar</Button>
                                </div>
                            ) : (
                                <Button size="sm" variant="outline" onClick={() => idInputRef.current?.click()}>
                                    <Upload className="h-4 w-4 mr-2" /> Subir
                                </Button>
                            )}
                        </div>

                        {/* Pagaré */}
                        <div className="flex items-center justify-between border p-3 rounded-lg">
                            <div className="flex items-center gap-3">
                                <FileText className="text-slate-400" />
                                <div>
                                    <p className="font-medium text-sm">Pagaré Firmado</p>
                                    <p className="text-xs text-slate-400">{loan.promissory_note_url ? "Disponible" : "Pendiente"}</p>
                                </div>
                            </div>
                            {loan.promissory_note_url ? (
                                <div className="flex gap-2">
                                    <a href={loan.promissory_note_url} target="_blank" rel="noopener noreferrer">
                                        <Button size="sm" variant="outline"><Download className="h-4 w-4" /></Button>
                                    </a>
                                    <Button size="sm" variant="ghost" onClick={() => noteInputRef.current?.click()} className="text-xs text-blue-600">Cambiar</Button>
                                </div>
                            ) : (
                                <Button size="sm" variant="outline" onClick={() => noteInputRef.current?.click()}>
                                    <Upload className="h-4 w-4 mr-2" /> Subir
                                </Button>
                            )}
                        </div>

                        {/* Transfer Proof */}
                        <div className="flex items-center justify-between border p-3 rounded-lg">
                            <div className="flex items-center gap-3">
                                <FileText className="text-slate-400" />
                                <div>
                                    <p className="font-medium text-sm">Comprobante Desembolso</p>
                                    <p className="text-xs text-slate-400">{loan.transfer_proof_url ? "Disponible" : "Pendiente"}</p>
                                </div>
                            </div>
                            {loan.transfer_proof_url ? (
                                <div className="flex gap-2">
                                    <a href={loan.transfer_proof_url} target="_blank" rel="noopener noreferrer">
                                        <Button size="sm" variant="outline"><Download className="h-4 w-4" /></Button>
                                    </a>
                                    <Button size="sm" variant="ghost" onClick={() => transferInputRef.current?.click()} className="text-xs text-blue-600">Cambiar</Button>
                                </div>
                            ) : (
                                <Button size="sm" variant="outline" onClick={() => transferInputRef.current?.click()}>
                                    <Upload className="h-4 w-4 mr-2" /> Subir
                                </Button>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Payment History */}
            <Card>
                <CardHeader>
                    <CardTitle>Historial de Pagos</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 text-slate-500">
                                <tr>
                                    <th className="p-3">Fecha</th>
                                    <th className="p-3">Monto</th>
                                    <th className="p-3">Tipo</th>
                                    <th className="p-3">Estado</th>
                                    <th className="p-3">Comprobante</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {payments.map((pay) => (
                                    <tr key={pay.id} className="hover:bg-slate-50">
                                        <td className="p-3 font-medium">{format(new Date(pay.payment_date), 'dd/MM/yyyy')}</td>
                                        <td className="p-3">${Number(pay.amount).toLocaleString()}</td>
                                        <td className="p-3 capitalize">{pay.payment_type === 'fee' ? 'Mora' : pay.payment_type}</td>
                                        <td className="p-3">
                                            {pay.late_fee_waived ? (
                                                <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">Mora Perdonada</Badge>
                                            ) : (
                                                <Badge variant="secondary">Exitoso</Badge>
                                            )}
                                        </td>
                                        <td className="p-3 flex items-center gap-3">
                                            {pay.proof_url ? (
                                                <a href={pay.proof_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center gap-1">
                                                    <FileText className="h-3 w-3" /> Ver Foto
                                                </a>
                                            ) : (
                                                <span className="text-slate-300 text-xs text-center block w-16">Sin foto</span>
                                            )}

                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="text-red-400 hover:text-red-700 hover:bg-red-50"
                                                onClick={async () => {
                                                    if (!confirm('¿Seguro que quieres borrar este pago? Se restará de las ganancias.')) return;

                                                    const { error } = await supabase.from('payments').delete().eq('id', pay.id)
                                                    if (error) alert('Error al borrar')
                                                    else window.location.reload()
                                                }}
                                            >
                                                Trash
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                                {payments.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="p-8 text-center text-slate-400">
                                            No hay pagos registrados aún.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
