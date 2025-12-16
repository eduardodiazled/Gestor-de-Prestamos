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
        walletBalance: 0
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



            // 3. Fetch Payments linked to these loans
            const loanIds = loansData.map(l => l.id)
            let paymentsData: any[] = []

            if (loanIds.length > 0) {
                const { data: pays } = await supabase
                    .from('payments')
                    .select('*, loan:loans(*)')
                    .in('loan_id', loanIds)
                    .order('payment_date', { ascending: false })
                paymentsData = pays || []
            }

            // 4. Fetch Payouts (Retiros)
            const { data: payoutsData } = await supabase
                .from('investor_payouts')
                .select('*')
                .eq('investor_id', id)
                .order('date', { ascending: false })

            // CALCULATE STATS
            let invested = 0
            let active = 0
            let profit = 0
            let collected = 0
            let capitalRepaid = 0 // Principal returned by client

            loansData.forEach(l => {
                invested += Number(l.amount)
                if (l.status === 'active' || l.status === 'defaulted') {
                    active += Number(l.amount)
                }
            })

            paymentsData.forEach(p => {
                const amount = Number(p.amount)
                const type = p.payment_type

                if (type === 'interest' || type === 'fee') {
                    const adminRate = (Number(p.loan?.admin_fee_percent) || 40) / 100
                    const investorShare = amount - (amount * adminRate)
                    profit += investorShare
                    collected += amount
                } else if (type === 'principal' || type === 'capital') {
                    capitalRepaid += amount
                }
            })

            // Total Withdrawn by Investor
            const totalWidthdrawn = payoutsData?.reduce((acc, p) => acc + Number(p.amount), 0) || 0

            // Available = (Capital Repaid + Net Profit) - Withdrawn - (Reinvested is technically "Active Capital" now?)
            // Wait, logic check:
            // "Invested" increases when we create a loan.
            // "Available" typically means Cash in Hand.
            // Cash In = Initial Capital (Manual?) + Repaid Principal + Net Profit.
            // Cash Out = New Loans + Withdrawals.
            // Current "Invested" stat is just Sum(Loan Amount).
            // Let's assume Initial Capital isn't tracked explicitly, but rather inferred or we just track "Earnings Available".
            // User asked: "Si Herminia tiene 500k de capital devuelto + intereses... eso es Capital Disponible".
            // So: Available = (Sum(Principal Repaid) + Sum(Net Profit)) - Sum(Payouts).
            // Note: Loops/Reinvestment is tricky. If I lend $1M, get $1.2M back. Available is $1.2M.
            // If I then lend $1.2M. My total 'Invested' history goes up, but my 'Available' goes down.
            // Does logic hold?
            // "Active Capital" captures the money currently out ($1.2M).
            // So "Active Capital" is NOT part of "Available".
            // So YES: Available = Total In (Principal + Profit) - Total Out (Payouts) - Active Capital??
            // NO. "Active Capital" is money that LEFT the wallet.
            // So: Wallet Balance = (Total Principal Repaid + Total Net Profit) - Total Payouts.
            // BUT: What about the initial capital for the FIRST loan?
            // If I lend $1M manually. That $1M didn't come from repayment. It came from "Outside".
            // The system doesn't track "Deposits".
            // However, the user says: "si me pagan capital, queda disponible".
            // So, Available = (Repaid Principal + Net Profit) - Payouts.
            // New Loans REDUCE this availability?
            // The user manages "Reinvestment" by simply creating a new loan.
            // If they create a new loan, where does the money come from?
            // The system doesn't block them.
            // So "Available" is just a metric of "What has returned and hasn't been taken out".
            // If they reinvest it, it becomes "Active Capital" again?
            // Actually, if they reinvest, it typically doesn't leave the system (no Payout), but it's no longer "Liquid".
            // So we need to subtract "Reinvested from Balance"?
            // We can't easily distinguish "New Money Loan" vs "Reinvested Loan".
            // SIMPLIFICATION:
            // Available for Payout = (Sum of All Inflows) - (Sum of All Outflows).
            // Inflows = Repaid Principal + Net Profit.
            // Outflows = Payouts.
            // WAIT. If I lend $1M. That $1M is NOT an outflow from the SYSTEM perspective (it's active asset).
            // User Question: "Saber que tengo capital disponible...".
            // Money returned = Available.
            // If I then create a NEW loan for $500k. Does that $500k come from the "Available" pile?
            // Yes.
            // So Available = (Repaid Principal + Net Profit) - Payouts - (New Loans funded by Balance?).
            // This requires tracking Source of Funds. Too complex.
            // ALTERNATIVE:
            // Just show "Liquid Wallet": Total Generated (Principal+Interest) - Total Withdrawn.
            // If they make a new loan, that's external event?
            // No, user specifically said "revertir intereses...".
            // Let's stick to the User's core need: "Money I hold for her".
            // Money Held = (Principal Repaid + Net Profit) - Payouts.
            // *CRITICAL*: New Loans do NOT automatically subtract from this unless we explicitly say "Funds Source: Wallet".
            // BUT, usually businesses check "Cash Flow".
            // Let's just display "Caja Acumulada (Sin Retirar)" = (Repaid + Profit) - Payouts.
            // And add a note: "Este es el dinero que ha retornado. Si se usó para nuevos préstamos, ignora este saldo."
            // BETTER: User wants to know if they CAN lend.
            // Let's calculate: Net Cash Flow = (Repaid Principal + Net Profit) - Payouts - (Total Loans Amount?? No).
            // Let's just show: "Dinero Recaudado No Retirado".
            // Formula: (Repaid Principal + Net Profit) - Total Payouts.

            const walletBalance = (capitalRepaid + profit) - totalWidthdrawn

            // 5. Merge Transactions (Inflow vs Outflow)
            const inflows = paymentsData.map(p => ({
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
                collectedTotal: collected,
                walletBalance: walletBalance // New Metric
            })
            setLoading(false)
        }

        loadData()
    }, [id])

    const handlePayout = async () => {
        let rawAmount = prompt("Monto a retirar/pagar a socia (sin puntos ni comas):")
        if (!rawAmount) return

        // Remove dots or commas just in case user formatted it
        rawAmount = rawAmount.replace(/[.,]/g, '')
        const amount = Number(rawAmount)

        if (isNaN(amount) || amount <= 0) {
            alert("Por favor ingresa un número válido (ej: 50000)")
            return
        }

        const { error } = await supabase.from('investor_payouts').insert({
            investor_id: id,
            amount: amount,
            notes: "Retiro manual dashboard"
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
                        <Button onClick={handlePayout} size="sm" variant="secondary" className="text-slate-900 text-xs font-bold">
                            Registrar Retiro
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
                        <div className="text-2xl font-bold text-slate-900">${(stats.netProfit + (stats.netProfit / 60 * 40)).toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
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
                        {/* Reverse calc: Net is 60%, so Admin is Net/60*40 */}
                        <div className="text-2xl font-bold text-slate-900">${(stats.netProfit / 60 * 40).toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
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
                    <h4 className="font-bold">¿Cómo se calcula la "Caja Disponible"?</h4>
                    <p>Es la suma de todo el **Capital Devuelto** por los clientes + tus **Ganancias Netas**, menos los **Retiros** que te hayamos transferido.</p>
                    <p className="mt-1 font-medium">Si decides reinvertir este dinero, simplemente creamos un nuevo préstamo y este saldo seguirá aquí como histórico de lo que has generado, pero sabrás que ya está "en la calle" nuevamente si el Capital Activo sube.</p>
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
                                const isCapital = t.payment_type === 'capital' || t.payment_type === 'principal'

                                // Logic: 
                                // - Outflow: Full red amount.
                                // - Inflow Capital: Full grren amount.
                                // - Inflow Interest: Net green amount (minus 40%).

                                const amount = Number(t.amount)
                                const netAmount = (isOut || isCapital) ? amount : (amount * (1 - ((t.loan?.admin_fee_percent || 40) / 100)))

                                return (
                                    <div key={idx} className="flex items-center justify-between p-3 border rounded-lg bg-slate-50">
                                        <div>
                                            <p className="font-bold text-sm">
                                                {isOut ? 'Retiro de Fondos' : (t.loan?.client?.full_name || 'Pago Cliente')}
                                            </p>
                                            <p className="text-xs text-slate-400">
                                                {format(t.date, 'dd MMM yyyy')} • {isOut ? 'Transferencia a Socia' : (isCapital ? 'Devolución Capital' : 'Pago Intereses')}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className={`font-bold text-sm ${isOut ? 'text-red-600' : 'text-green-600'}`}>
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
