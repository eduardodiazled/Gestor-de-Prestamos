"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabase/client"
import { Loader2, LogOut, TrendingUp, Wallet, Users } from "lucide-react"
import { format } from "date-fns"

export default function InvestorDashboard() {
    const [loading, setLoading] = useState(true)
    const [profile, setProfile] = useState<any>(null)
    const [stats, setStats] = useState({
        invested: 0,
        profit: 0,
        activeLoans: 0
    })
    const [loans, setLoans] = useState<any[]>([])

    useEffect(() => {
        async function loadInvestorData() {
            setLoading(true)

            // 1. Get User & Profile
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

            // 2. Fetch My Loans
            const { data: myLoans } = await supabase
                .from('loans')
                .select('*, client:clients(*)')
                .eq('investor_id', user.id)
                .order('created_at', { ascending: false })

            // 3. Fetch My Payouts/Profit (Calculated from payments linked to my loans)
            // Simpler approach: Sum payments -> interest part
            const { data: myPayments } = await supabase
                .from('payments')
                .select('*, loan:loans!inner(investor_id)') // Filter by joined loan's investor_id
                .eq('loan.investor_id', user.id)

            if (myLoans) {
                const active = myLoans.filter(l => l.status === 'active' || l.status === 'defaulted')
                const invested = active.reduce((sum, l) => sum + Number(l.amount), 0)

                let profit = 0
                if (myPayments) {
                    myPayments.forEach((p: any) => {
                        if (p.payment_type === 'interest' || p.payment_type === 'fee') {
                            const amount = Number(p.amount)
                            const adminFee = (Number(p.loan?.admin_fee_percent) || 40) / 100
                            profit += amount * (1 - adminFee)
                        }
                    })
                }

                setStats({
                    invested,
                    profit,
                    activeLoans: active.length
                })
                setLoans(myLoans)
            }

            setLoading(false)
        }

        loadInvestorData()
    }, [])

    const handleLogout = async () => {
        await supabase.auth.signOut()
        window.location.href = '/login'
    }

    if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin h-8 w-8 text-blue-600" /></div>

    return (
        <div className="min-h-screen bg-slate-50 p-4 md:p-8">
            <div className="max-w-5xl mx-auto space-y-8">

                {/* Header */}
                <header className="flex flex-col md:flex-row justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">Hola, {profile?.full_name || 'Socia'} 👋</h1>
                        <p className="text-slate-500">Resumen de tus inversiones</p>
                    </div>
                    <Button variant="ghost" className="text-red-500 hover:bg-red-50 hover:text-red-600" onClick={handleLogout}>
                        <LogOut className="mr-2 h-4 w-4" /> Cerrar Sesión
                    </Button>
                </header>

                {/* KPIs */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card className="bg-blue-600 text-white border-0 shadow-lg shadow-blue-200">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-blue-100 font-medium text-sm flex items-center gap-2">
                                <Wallet className="h-4 w-4" /> Capital Activo
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold">${stats.invested.toLocaleString()}</div>
                            <p className="text-blue-200 text-xs mt-1">Dinero prestado actualmente</p>
                        </CardContent>
                    </Card>

                    <Card className="border-0 shadow-md">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-green-600 font-medium text-sm flex items-center gap-2">
                                <TrendingUp className="h-4 w-4" /> Ganancias Totales
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-slate-800">${stats.profit.toLocaleString()}</div>
                            <p className="text-slate-400 text-xs mt-1">Intereses generados (Neto)</p>
                        </CardContent>
                    </Card>

                    <Card className="border-0 shadow-md">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-purple-600 font-medium text-sm flex items-center gap-2">
                                <Users className="h-4 w-4" /> Préstamos
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-slate-800">{stats.activeLoans}</div>
                            <p className="text-slate-400 text-xs mt-1">Créditos vigentes</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Loans List */}
                <Card className="border shadow-sm">
                    <CardHeader>
                        <CardTitle>Mis Préstamos</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {loans.length === 0 ? (
                            <div className="text-center py-12 text-slate-400">
                                No tienes préstamos activos en este momento.
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-xs">
                                        <tr>
                                            <th className="p-4 rounded-tl-lg">Cliente</th>
                                            <th className="p-4">Monto</th>
                                            <th className="p-4">Fecha Inicio</th>
                                            <th className="p-4 rounded-tr-lg">Estado</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {loans.map(loan => (
                                            <tr key={loan.id} className="hover:bg-slate-50 transition-colors">
                                                <td className="p-4 font-medium text-slate-700">
                                                    {loan.client?.full_name || 'Cliente Confidencial'}
                                                </td>
                                                <td className="p-4 font-bold text-slate-900">
                                                    ${Number(loan.amount).toLocaleString()}
                                                </td>
                                                <td className="p-4 text-slate-500">
                                                    {format(new Date(loan.start_date), 'dd MMM yyyy')}
                                                </td>
                                                <td className="p-4">
                                                    <Badge variant={loan.status === 'defaulted' ? 'destructive' : 'secondary'}
                                                        className={loan.status === 'active' ? 'bg-green-100 text-green-700 hover:bg-green-200' : ''}>
                                                        {loan.status === 'active' ? 'Al Día' :
                                                            loan.status === 'paid' ? 'Pagado' :
                                                                loan.status === 'completed' ? 'Finalizado' : 'En Mora'}
                                                    </Badge>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
