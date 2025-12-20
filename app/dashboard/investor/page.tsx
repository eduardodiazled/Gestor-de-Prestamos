"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabase/client"
import { Loader2, LogOut, TrendingUp, Wallet, Users, ArrowUpRight, ArrowDownLeft, Info, DollarSign, FileText } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"

export default function InvestorDashboard() {
    const [loading, setLoading] = useState(true)
    const [profile, setProfile] = useState<any>(null)
    const [stats, setStats] = useState({
        activeCapital: 0,
        grossProfit: 0,
        netProfit: 0,
        adminFee: 0,
        repaidCapital: 0,
        totalWithdrawn: 0,
        availableCash: 0
    })
    const [loans, setLoans] = useState<any[]>([])
    const [movements, setMovements] = useState<any[]>([])
    const [selectedLoan, setSelectedLoan] = useState<any>(null)

    useEffect(() => {
        async function loadInvestorData() {
            setLoading(true)

            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                window.location.href = '/login'
                return
            }

            const { data: profileData } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single()
            setProfile(profileData)

            // 1. Fetch Loans
            const { data: myLoans } = await supabase
                .from('loans')
                .select('*, client:clients(*)')
                .eq('investor_id', user.id)
                .order('start_date', { ascending: false })

            // 2. Fetch Payments (Inflows)
            const { data: myPayments } = await supabase
                .from('payments')
                .select('*, loan:loans!inner(investor_id)')
                .eq('loan.investor_id', user.id)
                .order('payment_date', { ascending: false })

            // 3. Fetch Payouts (Outflows) - Assuming this table exists, if not we default empty
            const { data: myPayouts } = await supabase
                .from('investor_payouts')
                .select('*')
                .eq('investor_id', user.id)
                .order('date', { ascending: false })

            // --- CALCULATIONS ---
            let activeCap = 0
            let grossP = 0
            let adminF = 0
            let netP = 0
            let repaidCap = 0
            let withdrawn = 0

            // A. Loans Stats
            if (myLoans) {
                myLoans.forEach(l => {
                    if (l.status === 'active' || l.status === 'defaulted') {
                        activeCap += Number(l.amount)
                    }
                })
                setLoans(myLoans)
            }

            // B. Payments Stats (Analyze Inflows)
            const paymentMovements = (myPayments || []).map((p: any) => {
                const amount = Number(p.amount)
                let netAmount = amount
                let type = 'payment'

                // Logic breakdown
                if (p.payment_type === 'interest' || p.payment_type === 'fee') {
                    const feePercent = (Number(p.loan?.admin_fee_percent) || 40) / 100
                    const adminPart = amount * feePercent
                    const netPart = amount - adminPart

                    grossP += amount
                    adminF += adminPart
                    netP += netPart
                    netAmount = netPart // For the movement feed
                } else if (p.payment_type === 'capital' || p.payment_type === 'principal') {
                    repaidCap += amount
                }

                return {
                    id: p.id,
                    type: 'inflow',
                    title: 'Pago Cliente',
                    subtitle: format(new Date(p.payment_date), 'dd MMM yyyy', { locale: es }),
                    amount: netAmount,
                    gross: amount,
                    isInterest: p.payment_type === 'interest'
                }
            })

            // C. Payouts Stats (Analyze Outflows)
            if (myPayouts) {
                myPayouts.forEach((p: any) => {
                    withdrawn += Number(p.amount)
                })
            }
            const payoutMovements = (myPayouts || []).map((p: any) => ({
                id: p.id,
                type: 'outflow',
                title: 'Retiro Registrado',
                subtitle: format(new Date(p.date), 'dd MMM yyyy', { locale: es }),
                amount: Number(p.amount)
            }))

            // D. Combine Feed
            // E. Final Cash Logic (Cash Flow Simulation)
            // We simulate the wallet over time. If a loan requires money we don't have, we assume an external deposit.
            // Events: Loan (-) | Payment (+) | Payout (-)

            const events = [
                ...(myLoans || []).map(l => ({
                    type: 'loan',
                    date: new Date(l.start_date || l.created_at).getTime(),
                    amount: Number(l.amount)
                })),
                ...(myPayments || []).map(p => ({
                    type: 'payment',
                    date: new Date(p.payment_date).getTime(),
                    amount: Number(p.amount)
                })),
                ...(myPayouts || []).map(p => ({
                    type: 'payout',
                    date: new Date(p.date).getTime(),
                    amount: Number(p.amount)
                }))
            ].sort((a, b) => a.date - b.date)

            let simulatedBalance = 0

            events.forEach(e => {
                if (e.type === 'payment') {
                    // Inflow
                    // Logic: If Interest/Fee, we only add the Investor Share?
                    // Verify: 'myPayments' logic above calculated 'repaidCap' and 'netP'.
                    // We should be consistent. The 'amount' in payment is Gross.
                    // We need Net for the wallet.
                    // Let's re-map events to use NET amounts.
                }
            })

            // Re-do event mapping with logic
            const sortedEvents = [
                ...(myLoans || []).map(l => ({
                    type: 'loan',
                    date: new Date(l.start_date || l.created_at).getTime(),
                    amount: Number(l.amount)
                })),
                ...(myPayments || []).map(p => {
                    const amt = Number(p.amount)
                    let net = amt
                    if (p.payment_type === 'interest' || p.payment_type === 'fee') {
                        const fee = (Number(p.loan?.admin_fee_percent) || 40) / 100
                        net = amt - (amt * fee)
                    }
                    return {
                        type: 'payment',
                        date: new Date(p.payment_date).getTime(),
                        amount: net
                    }
                }),
                ...(myPayouts || []).map(p => ({
                    type: 'payout',
                    date: new Date(p.date).getTime(),
                    amount: Number(p.amount)
                }))
            ].sort((a, b) => a.date - b.date)

            let virtualWallet = 0

            sortedEvents.forEach(e => {
                if (e.type === 'payment') {
                    virtualWallet += e.amount
                } else if (e.type === 'payout') {
                    virtualWallet -= e.amount
                } else if (e.type === 'loan') {
                    // If we have enough cash, use it.
                    // If not, assume external deposit covers the difference (so wallet doesn't go negative, or effectively goes to 0).
                    if (virtualWallet >= e.amount) {
                        virtualWallet -= e.amount
                    } else {
                        // We use meaningful cash, rest is external. 
                        // Example: Have 100. Loan 500. Use 100. Wallet = 0. (400 came from outside).
                        virtualWallet = 0
                    }
                }
            })

            const available = virtualWallet

            setStats({
                activeCapital: activeCap,
                grossProfit: grossP,
                netProfit: netP,
                adminFee: adminF,
                repaidCapital: repaidCap,
                totalWithdrawn: withdrawn,
                availableCash: available
            })

            setLoading(false)
        }

        loadInvestorData()
    }, [])

    const handleLogout = async () => {
        await supabase.auth.signOut()
        window.location.href = '/login'
    }

    if (loading) return <div className="h-screen flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin h-8 w-8 text-slate-400" /></div>

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-12">

            {/* 1. DARK HEADER */}
            {/* 1. DARK HEADER */}
            <header className="bg-slate-950 text-white pt-8 pb-20 px-4 md:px-8 shadow-lg border-b border-white/10">
                <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div>
                        <div className="flex items-center gap-2 text-emerald-400 mb-1 text-sm font-bold uppercase tracking-wider">
                            <Users className="h-4 w-4" /> ZALDO | Socio
                        </div>
                        <h1 className="text-4xl font-extrabold tracking-tight mb-2 text-white">{profile?.full_name || 'Inversionista'}</h1>
                        <Button
                            variant="link"
                            onClick={handleLogout}
                            className="text-slate-400 hover:text-white p-0 h-auto font-normal text-sm"
                        >
                            <LogOut className="h-3 w-3 mr-1" /> Cerrar Sesión Segura
                        </Button>
                    </div>

                    <div className="bg-slate-900/50 backdrop-blur-sm p-4 rounded-xl border border-white/10 flex flex-col md:items-end min-w-[280px]">
                        <p className="text-xs text-slate-400 font-medium uppercase tracking-wider mb-1">Caja Disponible (Retornado + Ganancia)</p>
                        <div className="text-4xl font-bold text-emerald-400 mb-3">
                            ${stats.availableCash.toLocaleString()}
                        </div>
                        {/* Admin Only Button Removed */}
                        <p className="text-[10px] text-slate-500 mt-2 text-right w-full">Este dinero está en tu poder.</p>
                    </div>
                </div>
            </header>

            <div className="max-w-6xl mx-auto px-4 md:px-8 -mt-12 space-y-8">

                {/* 2. KPI CARDS */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {/* Gross Profit */}
                    <Card className="shadow-lg border-0 ring-1 ring-slate-100">
                        <CardHeader className="pb-2 pt-6">
                            <CardTitle className="text-sm font-medium text-slate-500 flex justify-between">
                                Ganancia Bruta (Total) <DollarSign className="h-4 w-4 text-slate-300" />
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-slate-800">
                                ${stats.grossProfit.toLocaleString()}
                            </div>
                            <p className="text-xs text-slate-400 mt-1">Intereses Totales Generados</p>
                        </CardContent>
                    </Card>

                    {/* Net Profit (Highlighted) */}
                    <Card className="shadow-lg border-0 ring-1 ring-green-100 bg-green-50/50">
                        <CardHeader className="pb-2 pt-6">
                            <CardTitle className="text-sm font-bold text-green-700 flex justify-between">
                                Tu Ganancia Neta <TrendingUp className="h-4 w-4 text-green-600" />
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-green-700">
                                +${stats.netProfit.toLocaleString()}
                            </div>
                            <p className="text-xs text-green-600/80 mt-1 font-medium">Lo que te corresponde</p>
                        </CardContent>
                    </Card>

                    {/* Admin Fee */}
                    <Card className="shadow-lg border-0 ring-1 ring-slate-100">
                        <CardHeader className="pb-2 pt-6">
                            <CardTitle className="text-sm font-medium text-slate-500 flex justify-between">
                                Comisión Administración <Users className="h-4 w-4 text-slate-300" />
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-slate-800">
                                ${stats.adminFee.toLocaleString()}
                            </div>
                            <p className="text-xs text-slate-400 mt-1">Pago por gestión operativa</p>
                        </CardContent>
                    </Card>

                    {/* Active Capital (Risk) */}
                    <Card className="shadow-lg border-0 ring-1 ring-slate-100">
                        <CardHeader className="pb-2 pt-6">
                            <CardTitle className="text-sm font-medium text-slate-500 flex justify-between">
                                Capital Activo (Riesgo) <Info className="h-4 w-4 text-slate-300" />
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-slate-800">
                                ${stats.activeCapital.toLocaleString()}
                            </div>
                            <p className="text-xs text-slate-400 mt-1">Dinero en calle</p>
                        </CardContent>
                    </Card>
                </div>

                {/* 3. INFO ALERT */}
                <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 flex gap-4 text-blue-900 shadow-sm">
                    <Info className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                    <div className="text-sm space-y-1">
                        <p className="font-bold text-blue-800">¿Cómo se calcula la "Caja Disponible"?</p>
                        <p className="text-blue-700/80 leading-relaxed">
                            Es la suma de todo el <strong>Capital Devuelto</strong> por los clientes + tus <strong>Ganancias Netas</strong>, menos los <strong>Retiros</strong> que te hayamos transferido.
                            <br />
                            Si decides reinventir este dinero, simplemente creamos un nuevo préstamo y este saldo seguirá aquí como histórico, pero sabrás que ya está "en la calle" nuevamente si el Capital Activo sube.
                        </p>
                    </div>
                </div>

                {/* 4. MAIN CONTENT GRID */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* LEFT: Loans List */}
                    <div className="lg:col-span-2 space-y-4">
                        <h2 className="text-xl font-bold text-slate-900">Mis Clientes y Préstamos</h2>

                        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                            <div className="p-4 border-b border-slate-50 flex items-center gap-2">
                                <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
                                <span className="text-sm font-medium text-slate-600">En Curso</span>
                            </div>

                            {loans.length === 0 ? (
                                <div className="p-8 text-center text-slate-400 text-sm">No tienes préstamos activos.</div>
                            ) : (
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-slate-50/50 text-slate-400 font-medium">
                                        <tr>
                                            <th className="p-4 pl-6">Cliente</th>
                                            <th className="p-4">Inicio</th>
                                            <th className="p-4">Monto</th>
                                            <th className="p-4 pr-6 text-right">Estado</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {loans.map(loan => (
                                            <tr key={loan.id} className="hover:bg-slate-50/80 transition-colors group cursor-pointer" onClick={() => setSelectedLoan(loan)}>
                                                <td className="p-4 pl-6 font-medium text-slate-700 flex items-center gap-3">
                                                    <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                                                        <Users className="h-4 w-4" />
                                                    </div>
                                                    <div>
                                                        <div className="group-hover:text-blue-600 underline-offset-4 group-hover:underline transition-all">
                                                            {loan.client?.full_name || 'Desconocido'}
                                                        </div>
                                                        <div className="text-[10px] text-slate-400 font-normal">Click para ver documentos</div>
                                                    </div>
                                                </td>
                                                <td className="p-4 text-slate-500">
                                                    {format(new Date(loan.start_date), 'dd/MM/yyyy')}
                                                </td>
                                                <td className="p-4 font-bold text-slate-800">
                                                    ${Number(loan.amount).toLocaleString()}
                                                </td>
                                                <td className="p-4 pr-6 text-right">
                                                    <Badge className={
                                                        loan.status === 'active' ? 'bg-green-500 hover:bg-green-600' :
                                                            loan.status === 'defaulted' ? 'bg-red-500 hover:bg-red-600' : 'bg-slate-500'
                                                    }>
                                                        {loan.status === 'active' ? 'Al Día' :
                                                            loan.status === 'defaulted' ? 'En Mora' : 'Pagado'}
                                                    </Badge>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>

                    {/* RIGHT: Wallet Feed */}
                    <div className="space-y-4">
                        <h2 className="text-xl font-bold text-slate-900">Billetera / Movimientos</h2>

                        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 min-h-[400px] h-[500px] overflow-y-auto">
                            {movements.length === 0 ? (
                                <p className="text-center text-slate-400 text-sm mt-12">Aún no hay movimientos registradas.</p>
                            ) : (
                                <ul className="space-y-4 relative">
                                    {/* Timeline line */}
                                    <div className="absolute left-4 top-2 bottom-2 w-0.5 bg-slate-100"></div>

                                    {movements.map((move, i) => (
                                        <li key={i} className="relative pl-10">
                                            {/* Dot */}
                                            <div className={`absolute left-2.5 top-1.5 h-3 w-3 rounded-full border-2 border-white shadow-sm z-10 
                                                ${move.type === 'inflow' ? 'bg-green-500' : 'bg-red-400'}`}></div>

                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <p className="font-bold text-slate-800 text-sm">{move.title}</p>
                                                    <p className="text-xs text-slate-400 capitalize">{move.subtitle}</p>
                                                    {move.isInterest && (
                                                        <p className="text-[10px] text-slate-400 mt-1">Concepto: Intereses</p>
                                                    )}
                                                </div>
                                                <div className="text-right">
                                                    <p className={`font-bold text-sm ${move.type === 'inflow' ? 'text-green-600' : 'text-red-500'}`}>
                                                        {move.type === 'inflow' ? '+' : '-'}${move.amount.toLocaleString()}
                                                    </p>
                                                    {move.type === 'inflow' && move.gross && (
                                                        <p className="text-[10px] text-slate-300">Bruto: ${move.gross.toLocaleString()}</p>
                                                    )}
                                                </div>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>

                </div>
            </div>

            {/* Document Details Modal */}
            <Dialog open={!!selectedLoan} onOpenChange={(open) => !open && setSelectedLoan(null)}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Documentación del Préstamo</DialogTitle>
                    </DialogHeader>
                    {selectedLoan && (
                        <div className="space-y-6">
                            <div className="bg-slate-50 p-4 rounded-lg">
                                <p className="text-sm font-medium text-slate-500">Cliente</p>
                                <p className="font-bold text-lg">{selectedLoan.client?.full_name}</p>
                                <p className="text-xs text-slate-400">CC: {selectedLoan.client?.document_id || 'No registrada'}</p>
                            </div>

                            <div className="space-y-3">
                                <h4 className="text-sm font-semibold text-slate-900 border-b pb-2">Archivos Disponibles</h4>

                                {selectedLoan.promissory_note_url ? (
                                    <a href={selectedLoan.promissory_note_url} target="_blank" rel="noopener noreferrer"
                                        className="flex items-center gap-3 p-3 border rounded-lg hover:bg-slate-50 transition-colors group">
                                        <div className="h-10 w-10 bg-red-100 text-red-600 rounded-lg flex items-center justify-center">
                                            <FileText className="h-5 w-5" />
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-medium text-sm group-hover:text-blue-600">Pagaré Firmado</p>
                                            <p className="text-xs text-slate-400">PDF Original</p>
                                        </div>
                                        <ArrowUpRight className="h-4 w-4 text-slate-300 group-hover:text-blue-600" />
                                    </a>
                                ) : (
                                    <div className="p-3 border rounded-lg border-dashed text-slate-400 text-sm text-center">
                                        Pagaré no digitalizado
                                    </div>
                                )}

                                {selectedLoan.transfer_proof_url ? (
                                    <a href={selectedLoan.transfer_proof_url} target="_blank" rel="noopener noreferrer"
                                        className="flex items-center gap-3 p-3 border rounded-lg hover:bg-slate-50 transition-colors group">
                                        <div className="h-10 w-10 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center">
                                            <FileText className="h-5 w-5" />
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-medium text-sm group-hover:text-blue-600">Comprobante Desembolso</p>
                                            <p className="text-xs text-slate-400">Imagen / PDF</p>
                                        </div>
                                        <ArrowUpRight className="h-4 w-4 text-slate-300 group-hover:text-blue-600" />
                                    </a>
                                ) : (
                                    <div className="p-3 border rounded-lg border-dashed text-slate-400 text-sm text-center">
                                        Comprobante no adjunto
                                    </div>
                                )}
                            </div>

                            <div className="pt-2">
                                <Button className="w-full" onClick={() => setSelectedLoan(null)}>Cerrar</Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    )
}
