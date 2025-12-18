"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { supabase } from "@/lib/supabase/client"
import { format } from "date-fns"
import { PaymentForm } from "@/components/forms/PaymentForm"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

import { ArrowRight, LogOut, Users } from "lucide-react"
import { useRouter } from "next/navigation"

export default function Dashboard() {
    const router = useRouter()
    const handleLogout = async () => {
        await supabase.auth.signOut()
        router.refresh()
        router.replace('/login')
    }
    const [profile, setProfile] = useState<any>(null)
    const [stats, setStats] = useState({
        activeCapital: 0,
        totalProfit: 0,
        totalMora: 0,
        activeClients: 0,
        adminProfit: 0
    })
    const [investors, setInvestors] = useState<any[]>([])
    const [alerts, setAlerts] = useState<any[]>([])
    const [rawLoans, setRawLoans] = useState<any[] | null>(null)
    const [drafts, setDrafts] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function loadData() {
            setLoading(true)

            // 0. Check User & Role (Redirect if Investor)
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                if (!user) {
                    router.replace('/login')
                    return
                }
            }

            const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single()

            if (profileData?.role === 'investor') {
                if (profileData?.role === 'investor') {
                    router.replace('/dashboard/investor')
                    return
                }
            }
            setProfile(profileData)

            // 1. Fetch Loans & Payments
            const [{ data: loans }, { data: payments }] = await Promise.all([
                supabase.from('loans').select('*, client:clients(*), investor:profiles(*)'),
                supabase.from('payments').select('*, loan:loans(*)')
            ])

            setRawLoans(loans)

            if (!loans) {
                setLoading(false)
                return
            }

            // ... (Rest of existing calculation logic remains the same, assuming it functions correctly)
            // A. Calculate Active Capital & Clients (From Loans)
            let cap = 0
            let clients = new Set()
            let mora = 0

            // Map for quick investor lookup
            const invStats: Record<string, any> = {}

            loans.forEach(loan => {
                if (loan.status === 'active' || loan.status === 'defaulted') {
                    cap += Number(loan.amount)
                    clients.add(loan.client_id)
                }

                // Initialize investor stats
                const invName = loan.investor?.full_name || 'Unknown'
                const invId = loan.investor_id

                if (!invStats[invName]) invStats[invName] = { id: invId, capital: 0, profit: 0, collected: 0 }

                if (loan.status === 'active' || loan.status === 'defaulted') {
                    invStats[invName].capital += Number(loan.amount)
                }

                if (loan.status === 'defaulted') {
                    // Estimated pending interest for mora alert
                    mora += Number(loan.amount) * (Number(loan.interest_rate) / 100)
                }
            })

            // B. Calculate Real Profit (From Payments)
            let totalProfit = 0     // Investor Share
            let adminProfit = 0     // Admin Share

            if (payments) {
                payments.forEach(pay => {
                    // Only count Interest and Fees as Profit (Capital return is not profit)
                    if (pay.payment_type === 'interest' || pay.payment_type === 'fee') {
                        const amount = Number(pay.amount)

                        // Default fee if missing
                        const adminRate = (Number(pay.loan?.admin_fee_percent) || 40) / 100

                        const adminShare = amount * adminRate
                        const investorShare = amount - adminShare

                        adminProfit += adminShare
                        totalProfit += investorShare

                        // Add to specific investor stats
                        const loanDef = loans.find(l => l.id === pay.loan_id)
                        const invName = loanDef?.investor?.full_name || 'Unknown'

                        if (invStats[invName]) {
                            invStats[invName].profit += investorShare
                            invStats[invName].collected += amount
                        }
                    }
                })
            }

            setStats({
                activeCapital: cap,
                totalProfit: totalProfit,
                totalMora: mora,
                activeClients: clients.size,
                adminProfit: adminProfit
            })

            setInvestors(Object.entries(invStats).map(([name, data]) => ({ name, ...data })))

            // Alerts
            const moraLoans = loans.filter(l => l.status === 'defaulted')
            setAlerts(moraLoans.map(l => ({
                id: l.id,
                client: l.client?.full_name,
                amount: Number(l.amount) * (Number(l.interest_rate) / 100),
                status: 'Mora',
            })))

            setLoading(false)
        }

        loadData()
    }, [])

    if (loading) return <div className="p-8 text-center flex flex-col items-center justify-center h-screen space-y-4">
        <p>Cargando datos...</p>
    </div>

    return (
        <div className="p-4 space-y-6 max-w-xl mx-auto md:max-w-6xl">
            <header className="mb-8 flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-900 text-white p-6 rounded-xl shadow-lg border border-slate-800">
                <div>
                    <div className="flex items-center gap-2 text-emerald-400 mb-1 text-sm font-bold uppercase tracking-wider">
                        <Users className="h-4 w-4" /> ZALDO | Admin
                    </div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-white">
                        Hola, {profile?.full_name || 'CEO Luis Eduardo Diaz'} 👋
                    </h1>
                    <p className="text-slate-400">Gestión Fintech en Tiempo Real</p>
                </div>
                <div className="flex gap-2 items-center">
                    <Button onClick={() => window.location.href = '/dashboard/loans/new'} className="bg-emerald-500 text-white hover:bg-emerald-600 font-bold border-0">
                        + Nuevo Préstamo
                    </Button>
                    <Badge variant="secondary" className="text-lg px-4 py-1 border-slate-700 bg-slate-800 text-slate-300">
                        Ganancia Admin: ${stats.adminProfit.toLocaleString()}
                    </Badge>
                    <Button variant="ghost" size="icon" onClick={handleLogout} title="Cerrar Sesión" className="hover:bg-slate-800 text-slate-400">
                        <LogOut className="h-5 w-5" />
                    </Button>
                </div>
            </header>

            {/* DEBUG RAW DATA DUMP */}


            {/* Global KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500">Capital Activo</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-slate-900">${stats.activeCapital.toLocaleString()}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500">Mora Acumulada</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">${stats.totalMora.toLocaleString()}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500">Clientes Activos</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-slate-900">{stats.activeClients}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500">Ganancia Socias</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">${stats.totalProfit.toLocaleString()}</div>
                    </CardContent>
                </Card>
            </div>

            {/* Drafts Section */}
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Solicitudes en Curso (Borradores)</CardTitle>
                </CardHeader>
                <CardContent>
                    {drafts.length === 0 ? (
                        <p className="text-sm text-slate-400">No tienes solicitudes pendientes.</p>
                    ) : (
                        <ul className="space-y-2">
                            {drafts.map((d: any) => (
                                <li key={d.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 cursor-pointer"
                                    onClick={() => window.location.href = `/dashboard/loans/new?id=${d.id}`}>
                                    <div className="flex items-center gap-3">
                                        <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xs">
                                            {d.step}/3
                                        </div>
                                        <div>
                                            <p className="font-medium text-sm">{d.data?.client?.fullName || 'Solicitud Nueva'}</p>
                                            <p className="text-xs text-slate-500">
                                                {format(new Date(d.updated_at), 'dd MMM HH:mm')}
                                            </p>
                                        </div>
                                    </div>
                                    <Button size="sm" variant="ghost" className="text-blue-600">Continuar <ArrowRight className="h-3 w-3 ml-1" /></Button>
                                </li>
                            ))}
                        </ul>
                    )}
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Active Loans List with Actions */}
                {/* Active Loans List with Actions */}
                <Card className="md:col-span-2">
                    <CardHeader>
                        <CardTitle>
                            Préstamos Activos
                            <span className="ml-2 text-xs font-normal text-slate-500">
                                (Total: {(rawLoans || []).filter(l => l.status === 'active' || l.status === 'defaulted').length})
                            </span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-50 text-slate-500">
                                    <tr>
                                        <th className="p-3">Cliente</th>
                                        <th className="p-3">Monto</th>
                                        <th className="p-3">Estado</th>
                                        <th className="p-3">Acción</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {(rawLoans || [])
                                        .filter((loan: any) => loan.status === 'active' || loan.status === 'defaulted')
                                        .map((loan: any) => (
                                            <tr key={loan.id} className="hover:bg-slate-50">
                                                <td className="p-3 font-medium cursor-pointer hover:text-blue-600">
                                                    <a href={`/dashboard/loans/${loan.id}`}>
                                                        {loan.client?.full_name || 'Desconocido'}
                                                    </a>
                                                    <div className="text-xs text-slate-400">
                                                        Inv: {loan.investor?.full_name || 'N/A'}
                                                    </div>
                                                </td>
                                                <td className="p-3">${Number(loan.amount).toLocaleString()}</td>
                                                <td className="p-3">
                                                    <Badge variant={loan.status === 'defaulted' ? 'destructive' : 'default'} className={loan.status === 'active' ? 'bg-green-600' : ''}>
                                                        {loan.status === 'defaulted' ? 'En Mora' : 'Al Día'}
                                                    </Badge>
                                                </td>
                                                <td className="p-3">
                                                    <Dialog>
                                                        <DialogTrigger asChild>
                                                            <Button size="sm" variant="outline" className="border-blue-200 text-blue-700 hover:bg-blue-50">
                                                                Registrar Pago
                                                            </Button>
                                                        </DialogTrigger>
                                                        <DialogContent>
                                                            <DialogHeader>
                                                                <DialogTitle>Registrar Pago - {loan.client?.full_name}</DialogTitle>
                                                            </DialogHeader>
                                                            <PaymentForm
                                                                loanId={loan.id}
                                                                clientName={loan.client?.full_name}
                                                                suggestedAmount={Number(loan.amount) * (Number(loan.interest_rate) / 100)} // Suggest interest
                                                                onSuccess={() => window.location.reload()}
                                                            />
                                                        </DialogContent>
                                                    </Dialog>
                                                </td>
                                            </tr>
                                        ))}
                                    {(!rawLoans || rawLoans.filter(l => l.status === 'active' || l.status === 'defaulted').length === 0) && (
                                        <tr>
                                            <td colSpan={4} className="p-4 text-center text-slate-400">
                                                No hay préstamos activos.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>

                {/* Closed Loans List */}
                {(rawLoans || []).some(l => l.status === 'completed' || l.status === 'paid') && (
                    <Card className="md:col-span-2 opacity-75">
                        <CardHeader>
                            <CardTitle className="text-slate-500">
                                Préstamos Saldados / Cerrados
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <tbody className="divide-y">
                                        {(rawLoans || [])
                                            .filter((loan: any) => loan.status === 'completed' || loan.status === 'paid')
                                            .map((loan: any) => (
                                                <tr key={loan.id} className="hover:bg-slate-50 bg-slate-50/50">
                                                    <td className="p-3 font-medium text-slate-500">
                                                        <a href={`/dashboard/loans/${loan.id}`}>
                                                            {loan.client?.full_name || 'Desconocido'}
                                                        </a>
                                                        <span className="text-xs text-slate-400 ml-2">(Saldado)</span>
                                                    </td>
                                                    <td className="p-3 text-slate-500">${Number(loan.amount).toLocaleString()}</td>
                                                    <td className="p-3">
                                                        <Badge variant="outline" className="text-slate-500 border-slate-300">
                                                            Finalizado
                                                        </Badge>
                                                    </td>
                                                    <td className="p-3">
                                                        {/* No action for closed loans usually, or maybe View Details */}
                                                        <Button size="sm" variant="ghost" className="text-slate-400 h-8" onClick={() => window.location.href = `/dashboard/loans/${loan.id}`}>
                                                            Ver Detalles
                                                        </Button>
                                                    </td>
                                                </tr>
                                            ))}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Alerts Section */}
                <Card className="h-full">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            Alertas de Cobro
                            <Badge variant="destructive">{alerts.length}</Badge>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {alerts.length === 0 ? (
                            <p className="text-slate-500 text-sm">¡Felicitaciones! No hay clientes en mora.</p>
                        ) : (
                            <ul className="divide-y">
                                {alerts.map(alert => (
                                    <li key={alert.id} className="flex justify-between items-center py-3">
                                        <div>
                                            <p className="font-medium">{alert.client}</p>
                                            <p className="text-sm text-slate-500">Debe: ${alert.amount.toLocaleString()}</p>
                                        </div>
                                        <Badge variant="destructive">{alert.status}</Badge>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </CardContent>
                </Card>

                {/* Investor Breakdown */}
                <Card>
                    <CardHeader>
                        <CardTitle>Rendimiento por Socia</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {investors.map((inv) => (
                                <a key={inv.name} href={inv.id ? `/dashboard/investors/${inv.id}` : '#'} className="block hover:bg-slate-50 transition-colors">
                                    <div className="flex items-center justify-between p-2 border rounded-lg">
                                        <div>
                                            <p className="font-medium text-blue-600 flex items-center gap-1">
                                                {inv.name} <ArrowRight className="h-3 w-3" />
                                            </p>
                                            <p className="text-xs text-slate-500">Cap: ${inv.capital.toLocaleString()}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-bold text-green-600">+${inv.profit.toLocaleString()}</p>
                                            <p className="text-xs text-slate-400">Ganancia Real</p>
                                        </div>
                                    </div>
                                </a>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
