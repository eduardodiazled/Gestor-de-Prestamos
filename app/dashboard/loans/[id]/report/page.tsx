"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { supabase } from "@/lib/supabase/client"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { Loader2, Printer, TrendingUp, AlertCircle, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import Image from "next/image"
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import writtenNumber from 'written-number'

export default function LoanReportPage() {
    const params = useParams()
    const loanId = params?.id as string
    const [loading, setLoading] = useState(true)
    const [loan, setLoan] = useState<any>(null)
    const [payments, setPayments] = useState<any[]>([])

    // Stats
    const [stats, setStats] = useState({
        totalPrincipal: 0,
        totalInterest: 0,
        amountPaid: 0,
        balance: 0,
        progress: 0,
        projectedTotal: 0
    })

    useEffect(() => {
        if (loanId) loadData()
    }, [loanId])

    async function loadData() {
        setLoading(true)

        // Fetch Loan & Client
        const { data: loanData } = await supabase
            .from('loans')
            .select('*, client:clients(*)')
            .eq('id', loanId)
            .single()

        // Fetch Payments
        const { data: paymentsData } = await supabase
            .from('payments')
            .select('*')
            .eq('loan_id', loanId)
            .order('payment_date', { ascending: true })

        if (loanData) {
            const principal = Number(loanData.amount)
            let paid = 0

            paymentsData?.forEach(p => {
                paid += Number(p.amount)
            })

            // Simple Logic: Balance = Principal - CapitalPaid (This depends on logic, assume simple amort for now or interest-only)
            // For report visualization, let's show Total Paid vs Total Loan Amount context

            // Re-calculate based on simple interest model often used here
            // Assuming Balance is tracked or calculated. 
            // If interest only: Balance = Principal (until end).
            // Let's assume standard behavior:

            const balance = loanData.status === 'completed' ? 0 : principal // Simplified
            const progress = Math.min((paid / (principal * 1.2)) * 100, 100) // Estimate current progress against roughly 20% interest total? 
            // Better: Progress of TIME or EXPECTED RETURN.
            // Let's stick to concrete numbers: Paid vs Borrowed (Visual)

            setStats({
                totalPrincipal: principal,
                totalInterest: 0, // Dynamic
                amountPaid: paid,
                balance: balance,
                progress: progress,
                projectedTotal: principal
            })
            setLoan(loanData)
            setPayments(paymentsData || [])
        }
        setLoading(false)
    }

    const handlePrint = () => {
        window.print()
    }

    if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin h-8 w-8 text-slate-400" /></div>
    if (!loan) return <div className="text-center p-12">No se encontró el préstamo</div>

    // Charts Data
    const pieData = [
        { name: 'Pagado', value: stats.amountPaid, color: '#22c55e' }, // Green
        { name: 'Pendiente', value: Math.max(0, stats.totalPrincipal - stats.amountPaid), color: '#d1d5db' } // Gray
    ]

    const barData = payments.map((p, i) => ({
        date: format(new Date(p.payment_date), 'dd/MM'),
        monto: Number(p.amount),
        type: p.payment_type
    }))

    return (
        <div className="min-h-screen bg-white text-slate-900 font-sans">
            {/* PRINT CONTROLS (Hidden when printing) */}
            <div className="print:hidden fixed top-0 left-0 right-0 bg-slate-900 text-white p-4 flex justify-between items-center z-50 shadow-md">
                <div>
                    <h1 className="font-bold">Vista Previa de Reporte</h1>
                    <p className="text-xs text-slate-400">Tamaño recomendado: A4 Vertical</p>
                </div>
                <Button onClick={handlePrint} className="bg-white text-slate-900 hover:bg-slate-100 font-bold">
                    <Printer className="mr-2 h-4 w-4" /> Imprimir / Guardar PDF
                </Button>
            </div>

            {/* A4 PAGE CONTAINER */}
            <div className="max-w-[210mm] mx-auto bg-white p-12 md:p-16 pt-24 print:pt-0 print:p-0 print:max-w-none">

                {/* HEADER */}
                <header className="border-b-2 border-slate-900 pb-6 mb-8 flex justify-between items-end">
                    <div>
                        <div className="mb-2 flex items-center gap-4">
                            <div className="relative h-16 w-16">
                                <Image src="/logo.png" alt="ZALDO" fill className="object-contain" />
                            </div>
                            <div>
                                <h2 className="text-3xl font-bold text-slate-900 tracking-tight leading-none mb-1">ZALDO</h2>
                                <p className="text-sm text-slate-500 font-medium">Soluciones Fintech</p>
                            </div>
                        </div>
                        <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 uppercase mt-4">Estado de Cuenta</h1>
                        <p className="text-slate-500 mt-1 text-sm font-medium">Reporte generado el {format(new Date(), 'dd MMMM yyyy', { locale: es })}</p>
                    </div>
                    <div className="text-right">
                        <div className="text-2xl font-bold text-slate-900">{loan.client?.full_name}</div>
                        <p className="text-sm text-slate-500">ID Préstamo: #{loan.id.slice(0, 8)}</p>
                    </div>
                </header>

                {/* EXECUTIVE SUMMARY */}
                <div className="grid grid-cols-3 gap-8 mb-12">
                    <div className="p-6 bg-slate-50 rounded-xl border border-slate-100">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Monto Prestado</p>
                        <div className="text-3xl font-bold text-slate-900">${Number(loan.amount).toLocaleString()}</div>
                        <p className="text-xs text-slate-500 mt-1">
                            Inicio: {format(new Date(loan.start_date), 'dd MMM yyyy')}
                        </p>
                    </div>
                    <div className="p-6 bg-slate-50 rounded-xl border border-slate-100">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Total Pagado</p>
                        <div className="text-3xl font-bold text-green-600">${stats.amountPaid.toLocaleString()}</div>
                        <p className="text-xs text-slate-500 mt-1">
                            {payments.length} Cuotas registradas
                        </p>
                    </div>
                    <div className="p-6 bg-slate-50 rounded-xl border border-slate-100">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Estado Actual</p>
                        <div className="flex items-center gap-2">
                            {loan.status === 'active' && <CheckCircle2 className="h-6 w-6 text-blue-600" />}
                            {loan.status === 'defaulted' && <AlertCircle className="h-6 w-6 text-red-600" />}
                            <div className={`text-2xl font-bold ${loan.status === 'active' ? 'text-blue-600' :
                                loan.status === 'defaulted' ? 'text-red-600' : 'text-slate-900'
                                }`}>
                                {loan.status === 'active' ? 'Al Día' :
                                    loan.status === 'defaulted' ? 'En Mora' : 'Finalizado'}
                            </div>
                        </div>
                    </div>
                </div>

                {/* CHARTS SECTION */}
                <div className="grid grid-cols-2 gap-12 mb-12 h-64">
                    {/* Chart 1: Progress */}
                    <div className="relative">
                        <h3 className="text-sm font-bold text-slate-900 mb-4 border-l-4 border-slate-900 pl-3">Progreso del Capital</h3>
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={pieData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {pieData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Legend verticalAlign="bottom" height={36} />
                            </PieChart>
                        </ResponsiveContainer>
                        {/* Absolute Centered Text */}
                        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 mt-4 text-center">
                            <span className="text-xs text-slate-400">Pagado</span>
                            <div className="text-xl font-bold text-slate-900">
                                {Math.round((stats.amountPaid / stats.totalPrincipal) * 100)}%
                            </div>
                        </div>
                    </div>

                    {/* Chart 2: History */}
                    <div>
                        <h3 className="text-sm font-bold text-slate-900 mb-4 border-l-4 border-slate-900 pl-3">Historial de Pagos</h3>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={barData}>
                                <XAxis dataKey="date" fontSize={10} tickLine={false} axisLine={false} />
                                <Tooltip
                                    contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', fontSize: '12px' }}
                                    formatter={(value: number) => [`$${value.toLocaleString()}`, 'Monto']}
                                />
                                <Bar dataKey="monto" fill="#0f172a" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* DETAILED TABLE */}
                <div className="mb-12">
                    <h3 className="text-sm font-bold text-slate-900 mb-4 border-l-4 border-slate-900 pl-3">Detalle de Movimientos</h3>
                    <table className="w-full text-sm text-left border-collapse">
                        <thead>
                            <tr className="border-b-2 border-slate-200">
                                <th className="py-3 font-bold text-slate-500">Fecha</th>
                                <th className="py-3 font-bold text-slate-500">Concepto</th>
                                <th className="py-3 font-bold text-slate-500">Referencia / Notas</th>
                                <th className="py-3 font-bold text-slate-500 text-right">Monto</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {payments.map((p) => (
                                <tr key={p.id}>
                                    <td className="py-3 text-slate-900 font-medium">
                                        {format(new Date(p.payment_date), 'dd/MM/yyyy')}
                                    </td>
                                    <td className="py-3 text-slate-600 capitalize">
                                        {p.payment_type === 'interest' ? 'Pago de Intereses' :
                                            p.payment_type === 'capital' ? 'Abono a Capital' : 'Cuota General'}
                                    </td>
                                    <td className="py-3 text-slate-400 text-xs max-w-[200px] truncate">
                                        {p.notes || '-'}
                                    </td>
                                    <td className="py-3 text-slate-900 font-bold text-right">
                                        ${Number(p.amount).toLocaleString()}
                                    </td>
                                </tr>
                            ))}
                            {payments.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="py-8 text-center text-slate-400 italic">
                                        No hay movimientos registrados para este período.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                        <tfoot>
                            <tr className="border-t-2 border-slate-900">
                                <td colSpan={3} className="py-4 text-right font-bold text-slate-900 uppercase pr-8">Total Recaudado</td>
                                <td className="py-4 text-right font-extrabold text-xl text-slate-900">${stats.amountPaid.toLocaleString()}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>

                {/* FOOTER */}
                <footer className="text-center text-xs text-slate-400 mt-20 pt-8 border-t border-slate-100">
                    <p className="font-medium text-slate-500 mb-1">Este documento es un reporte informativo generado automáticamente.</p>
                    <p>Cualquier duda sobre la información presentada, favor contactar a la administración.</p>
                </footer>

            </div>
        </div>
    )
}
