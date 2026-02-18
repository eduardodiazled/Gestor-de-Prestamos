"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase/client"
import { format } from "date-fns"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Loader2, ArrowLeft, TrendingUp, DollarSign, Users, AlertCircle, FileText, Download } from "lucide-react"

export default function InvestorDetailsPage() {
    const params = useParams()
    const router = useRouter()
    const id = params.id as string

    const [profile, setProfile] = useState<any>(null)
    const [loans, setLoans] = useState<any[]>([])
    const [transactions, setTransactions] = useState<any[]>([])
    const [selectedLoan, setSelectedLoan] = useState<any>(null)
    const [loading, setLoading] = useState(true)

    // Financial Stats
    const [stats, setStats] = useState({
        investedCapital: 0,
        activeCapital: 0,
        netProfit: 0,
        collectedTotal: 0,
        walletBalance: 0,
        adminFee: 0
    })

    useEffect(() => {
        async function loadData() {
            // 1. Fetch Investor Profile
            // We use the ID to find the profile. (Assuming users table or profiles table)
            // Note: Since 'profiles' table might be joined in previous queries, let's fetch it directly.
            // If the ID passed is actually just a name from the dashboard grouping, we might need a different strategy.
            // BUT, the dashboard was using grouped names. We need to ensure we are passing a real ID.
            // Strategy: The Dashboard currently groups by NAME. It doesn't strictly have the ID in the grouped object if there are multiple.
            // HOWEVER, usually investor ID is consistent.

            // Wait! The Dashboard grouping logic lost the ID.
            // We need to fix Dashboard grouping to include ID.
            // For now, I will assume the ID passed in the URL IS the user/profile UUID.

            const { data: profileData } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', id)
                .single()

            // If strictly using 'profiles' table.
            // Fallback: If no profile found (maybe it's a raw string in the DB?), we handle it.

            // 2. Fetch Loans for this Investor
            const { data: loansData } = await supabase
                .from('loans')
                .select('*, client:clients(*)')
                .eq('investor_id', id)
                .order('start_date', { ascending: false })

            if (!loansData) {
                setLoading(false)
                return
            }



            // 3. Fetch Payments linked to these loans (Optimized Join)
            const { data: paymentsData, error: pError } = await supabase
                .from('payments')
                .select('*, loan!inner(*)')
                .eq('loan.investor_id', id)

            if (pError) console.error("Error fetching payments:", pError)
            const finalPayments = paymentsData || []

            // 4. Fetch Payouts (Retiros)
            const { data: payoutsData } = await supabase
                .from('investor_payouts')
                .select('*, type')
                .eq('investor_id', id)
                .order('date', { ascending: false })

            // CALCULATE STATS
            let invested = 0
            let active = 0
            let profit = 0
            let grossProfit = 0
            let adminFee = 0
            let capitalRepaid = 0 // Principal returned by client

            loansData.forEach(l => {
                invested += Number(l.amount)
                if (l.status === 'active' || l.status === 'defaulted') {
                    active += Number(l.amount)
                }
            })

            finalPayments.forEach(p => {
                const amount = Number(p.amount)
                const type = (p.payment_type || '').toLowerCase().trim()

                // Robust check: Anything NOT capital/principal is considered profit
                const isCapital = ['capital', 'principal'].includes(type)

                if (!isCapital && amount > 0) {
                    const adminRate = (Number(p.loan?.admin_fee_percent) || 40) / 100
                    const adminPart = amount * adminRate
                    const investorShare = amount - adminPart

                    profit += investorShare
                    adminFee += adminPart
                    grossProfit += amount
                } else if (isCapital) {
                    capitalRepaid += amount
                }
            })

            // Wallet Balance logic to match Investor View (Simulated)
            // Sequence events: Loans (-) | Payments (+) | Payouts (-)
            const events = [
                ...(loansData || []).map(l => ({
                    type: 'loan',
                    date: new Date(l.start_date || l.created_at).getTime(),
                    amount: Number(l.amount)
                })),
                ...finalPayments.map(p => {
                    const amt = Number(p.amount)
                    let net = amt
                    const pType = (p.payment_type || '').toLowerCase().trim()

                    const isCapital = ['capital', 'principal'].includes(pType)
                    if (!isCapital && amt > 0) {
                        const fee = (Number(p.loan?.admin_fee_percent) || 40) / 100
                        net = amt - (amt * fee)
                    }
                    return {
                        type: 'payment',
                        date: new Date(p.payment_date).getTime(),
                        amount: net
                    }
                }),
                ...(payoutsData || []).map(p => ({
                    type: 'payout',
                    payoutType: p.type, // 'payout' vs 'reinvestment'
                    date: new Date(p.date).getTime(),
                    amount: Number(p.amount)
                }))
            ].sort((a, b) => a.date - b.date)

            let simulatedWallet = 0
            events.forEach((e: any) => {
                if (e.type === 'payment') {
                    simulatedWallet += e.amount
                } else if (e.type === 'payout') {
                    if (e.payoutType !== 'reinvestment') {
                        simulatedWallet -= e.amount
                    }
                } else if (e.type === 'loan') {
                    // Logic: Only subtract from wallet if it has enough funds.
                    // If not, assume the loan was funded externally.
                    if (simulatedWallet >= e.amount) {
                        simulatedWallet -= e.amount
                    }
                }
            })

            // 5. Merge Transactions (Inflow vs Outflow)
            const inflows = finalPayments.map(p => ({
                ...p,
                date: new Date(p.payment_date),
                flow: 'in'
            }))

            const outflows = (payoutsData || []).map(p => ({
                ...p,
                date: new Date(p.date),
                flow: 'out'
            }))

            const allTx = [...inflows, ...outflows].sort((a, b) => b.date.getTime() - a.date.getTime())

            setProfile(profileData || { full_name: 'Inversionista' })
            setLoans(loansData)
            setTransactions(allTx)
            setStats({
                investedCapital: invested,
                activeCapital: active,
                netProfit: profit,
                collectedTotal: grossProfit, // Changed to use grossProfit
                walletBalance: simulatedWallet,
                adminFee: adminFee
            })
            setLoading(false)
        }

        loadData()
    }, [id])

    const handleMovement = async (movementType: 'payout' | 'reinvestment') => {
        const label = movementType === 'payout' ? 'retirar/pagar a socia' : 'reinvertir como capital'
        let rawAmount = prompt(`Monto a ${label} (sin puntos ni comas):`)
        if (!rawAmount) return

        rawAmount = rawAmount.replace(/[.,]/g, '')
        const amount = Number(rawAmount)

        if (isNaN(amount) || amount <= 0) {
            alert("Por favor ingresa un número válido (ej: 50000)")
            return
        }

        const notes = movementType === 'reinvestment'
            ? prompt('Nota (ej: "Reinversión para préstamo Dayan David"):') || 'Reinversión a capital'
            : 'Retiro manual dashboard'

        const { error } = await supabase.from('investor_payouts').insert({
            investor_id: id,
            amount: amount,
            type: movementType,
            notes: notes
        })

        if (error) {
            console.error(error)
            alert("Error al guardar: " + (error.message || error.details || JSON.stringify(error)))
        } else {
            window.location.reload()
        }
    }

    if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin" /></div>

    return (
        <div className="p-4 space-y-6 max-w-5xl mx-auto">
            <Button variant="ghost" onClick={() => router.push('/dashboard')} className="mb-4">
                <ArrowLeft className="mr-2 h-4 w-4" /> Volver al Dashboard Gral.
            </Button>

            {/* HEADER */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900 text-white p-6 rounded-xl">
                <div>
                    <h1 className="text-2xl font-bold">{profile?.full_name}</h1>
                    <p className="text-slate-400 text-sm">Portal de Socia</p>
                </div>
                <div className="text-right">
                    <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Caja Disponible (Retornado + Ganancia)</p>
                    <div className="flex items-center gap-3 justify-end">
                        <p className="text-4xl font-bold text-white">${stats.walletBalance?.toLocaleString()}</p>
                    </div>
                    <div className="flex gap-2 justify-end mt-2">
                        <Button onClick={() => handleMovement('payout')} size="sm" variant="secondary" className="text-slate-900 text-xs font-bold">
                            💸 Registrar Retiro
                        </Button>
                        <Button onClick={() => handleMovement('reinvestment')} size="sm" className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold">
                            🔄 Reinvertir Ganancias
                        </Button>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1">Este dinero está en tu poder.</p>
                </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Ganancia Bruta (Total)</CardTitle>
                        <DollarSign className="h-4 w-4 text-slate-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-slate-900">${stats.collectedTotal?.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                        <p className="text-xs text-slate-500">Intereses Totales Generados</p>
                    </CardContent>
                </Card>
                <Card className="bg-green-50 border-green-200">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-green-900">Tu Ganancia Neta</CardTitle>
                        <TrendingUp className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-700">+${stats.netProfit.toLocaleString()}</div>
                        <p className="text-xs text-green-600">Lo que te corresponde</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Comisión Administración</CardTitle>
                        <Users className="h-4 w-4 text-slate-500" />
                    </CardHeader>
                    <CardContent>
                        {/* Use real admin fee calculation */}
                        <div className="text-2xl font-bold text-slate-900">${stats.adminFee?.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                        <p className="text-xs text-slate-500">Pago por gestión operativa</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Capital Activo (Riesgo)</CardTitle>
                        <AlertCircle className="h-4 w-4 text-slate-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-slate-900">${stats.activeCapital.toLocaleString()}</div>
                        <p className="text-xs text-slate-500">Dinero en calle</p>
                    </CardContent>
                </Card>
            </div>

            <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg text-sm text-blue-800 flex gap-3">
                <AlertCircle className="h-5 w-5 shrink-0" />
                <div>
                    <h4 className="font-bold">¿Cómo se calcula la &quot;Caja Disponible&quot;?</h4>
                    <p>Es tu <strong>Ganancia Neta</strong> (60% de intereses cobrados), menos los <strong>Retiros</strong> que te hayamos transferido y las <strong>Reinversiones</strong> que hayas hecho a nuevo capital.</p>
                    <p className="mt-1 font-medium">Para reinvertir ganancias en un nuevo préstamo, primero usa el botón &quot;Reinvertir Ganancias&quot; y luego crea el préstamo.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* LISTA DE PRESTAMOS */}
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle>Mis Clientes y Préstamos</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-8">
                        {/* ACTIVOS */}
                        <div>
                            <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                                <div className="h-2 w-2 rounded-full bg-green-500"></div>
                                En Curso
                            </h3>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-slate-50 text-slate-500">
                                        <tr>
                                            <th className="p-3">Cliente</th>
                                            <th className="p-3">Inicio</th>
                                            <th className="p-3">Monto</th>
                                            <th className="p-3">Estado</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {loans.filter(l => l.status === 'active' || l.status === 'defaulted').map(loan => (
                                            <tr
                                                key={loan.id}
                                                className="hover:bg-slate-50 cursor-pointer"
                                                onClick={() => setSelectedLoan(loan)}
                                            >
                                                <td className="p-3 font-medium flex items-center gap-2">
                                                    <FileText className="h-3 w-3 text-slate-400" />
                                                    {loan.client?.full_name}
                                                </td>
                                                <td className="p-3">{format(new Date(loan.start_date), 'dd/MM/yyyy')}</td>
                                                <td className="p-3">${Number(loan.amount).toLocaleString()}</td>
                                                <td className="p-3">
                                                    <Badge variant={loan.status === 'defaulted' ? 'destructive' : 'default'} className={loan.status === 'active' ? 'bg-green-600' : ''}>
                                                        {loan.status === 'defaulted' ? 'Mora' : 'Al Día'}
                                                    </Badge>
                                                </td>
                                            </tr>
                                        ))}
                                        {loans.filter(l => l.status === 'active' || l.status === 'defaulted').length === 0 && (
                                            <tr><td colSpan={4} className="p-3 text-center text-slate-400">Sin préstamos activos.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* CERRADOS */}
                        {loans.some(l => l.status === 'paid' || l.status === 'completed') && (
                            <div>
                                <h3 className="text-sm font-bold text-slate-400 mb-3 flex items-center gap-2">
                                    <div className="h-2 w-2 rounded-full bg-slate-300"></div>
                                    Finalizados
                                </h3>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm text-left opacity-75">
                                        <thead className="bg-slate-50 text-slate-500">
                                            <tr>
                                                <th className="p-3">Cliente</th>
                                                <th className="p-3">Inicio</th>
                                                <th className="p-3">Monto</th>
                                                <th className="p-3">Estado</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y">
                                            {loans.filter(l => l.status === 'paid' || l.status === 'completed').map(loan => (
                                                <tr
                                                    key={loan.id}
                                                    className="hover:bg-slate-50 bg-slate-50/50 cursor-pointer"
                                                    onClick={() => setSelectedLoan(loan)}
                                                >
                                                    <td className="p-3 font-medium text-slate-500 flex items-center gap-2">
                                                        <FileText className="h-3 w-3 text-slate-400" />
                                                        {loan.client?.full_name}
                                                    </td>
                                                    <td className="p-3 text-slate-500">{format(new Date(loan.start_date), 'dd/MM/yyyy')}</td>
                                                    <td className="p-3 text-slate-500">${Number(loan.amount).toLocaleString()}</td>
                                                    <td className="p-3">
                                                        <Badge variant="outline">Pagado</Badge>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* MOVIMIENTOS RECIENTES */}
                <Card>
                    <CardHeader>
                        <CardTitle>Billetera / Movimientos</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                            {transactions.map((t, idx) => {
                                const isOut = t.flow === 'out'
                                const isReinvestment = isOut && t.type === 'reinvestment'
                                const isCapital = t.payment_type === 'capital' || t.payment_type === 'principal'

                                const amount = Number(t.amount)
                                const netAmount = (isOut || isCapital) ? amount : (amount * (1 - ((t.loan?.admin_fee_percent || 40) / 100)))

                                // Color logic: reinvestment = blue, payout = red, income = green
                                const colorClass = isReinvestment ? 'text-blue-600' : (isOut ? 'text-red-600' : 'text-green-600')
                                const bgClass = isReinvestment ? 'bg-blue-50 border-blue-200' : 'bg-slate-50'

                                // Label logic
                                let label = ''
                                if (isReinvestment) label = 'Reinversión a Capital'
                                else if (isOut) label = 'Retiro / Transferencia a Socia'
                                else if (isCapital) label = 'Devolución Capital'
                                else label = 'Pago Intereses'

                                let title = ''
                                if (isReinvestment) title = '🔄 ' + (t.notes || 'Reinversión')
                                else if (isOut) title = 'Retiro de Fondos'
                                else title = t.loan?.client?.full_name || 'Pago Cliente'

                                return (
                                    <div key={idx} className={`flex items-center justify-between p-3 border rounded-lg ${bgClass}`}>
                                        <div>
                                            <p className="font-bold text-sm">
                                                {title}
                                            </p>
                                            <p className="text-xs text-slate-400">
                                                {format(t.date, 'dd MMM yyyy')} • {label}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className={`font-bold text-sm ${colorClass}`}>
                                                {isOut ? '-' : '+'}${netAmount.toLocaleString()}
                                            </p>
                                            {!isOut && !isCapital && (
                                                <p className="text-[10px] text-slate-400">Bruto: ${amount.toLocaleString()}</p>
                                            )}
                                        </div>
                                    </div>
                                )
                            })}
                            {transactions.length === 0 && <p className="text-slate-400 text-center text-sm py-4">Sin movimientos aún.</p>}
                        </div>
                    </CardContent>
                </Card>
            </div>
            {/* Document Viewer Dialog */}
            <Dialog open={!!selectedLoan} onOpenChange={(open) => !open && setSelectedLoan(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Documentación: {selectedLoan?.client?.full_name}</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        {/* ID Card */}
                        <div className="flex items-center justify-between border p-3 rounded-lg">
                            <div className="flex items-center gap-3">
                                <FileText className="h-5 w-5 text-slate-400" />
                                <div>
                                    <p className="font-medium text-sm">Cédula Ciudadanía</p>
                                    <p className="text-xs text-slate-400">{selectedLoan?.client?.id_photo_url ? "Disponible" : "No disponible"}</p>
                                </div>
                            </div>
                            {selectedLoan?.client?.id_photo_url && (
                                <a href={selectedLoan.client.id_photo_url} target="_blank" rel="noopener noreferrer">
                                    <Button size="sm" variant="outline"><Download className="h-4 w-4" /></Button>
                                </a>
                            )}
                        </div>

                        {/* Promissory Note */}
                        <div className="flex items-center justify-between border p-3 rounded-lg">
                            <div className="flex items-center gap-3">
                                <FileText className="h-5 w-5 text-slate-400" />
                                <div>
                                    <p className="font-medium text-sm">Pagaré Firmado</p>
                                    <p className="text-xs text-slate-400">{selectedLoan?.promissory_note_url ? "Disponible" : "No disponible"}</p>
                                </div>
                            </div>
                            {selectedLoan?.promissory_note_url && (
                                <a href={selectedLoan.promissory_note_url} target="_blank" rel="noopener noreferrer">
                                    <Button size="sm" variant="outline"><Download className="h-4 w-4" /></Button>
                                </a>
                            )}
                        </div>

                        {/* Transfer Proof */}
                        <div className="flex items-center justify-between border p-3 rounded-lg">
                            <div className="flex items-center gap-3">
                                <FileText className="h-5 w-5 text-slate-400" />
                                <div>
                                    <p className="font-medium text-sm">Comprobante Desembolso</p>
                                    <p className="text-xs text-slate-400">{selectedLoan?.transfer_proof_url ? "Disponible" : "No disponible"}</p>
                                </div>
                            </div>
                            {selectedLoan?.transfer_proof_url && (
                                <a href={selectedLoan.transfer_proof_url} target="_blank" rel="noopener noreferrer">
                                    <Button size="sm" variant="outline"><Download className="h-4 w-4" /></Button>
                                </a>
                            )}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}
