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
        capitalPaid: 0,
        interestPaid: 0,
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
            let paidTotal = 0
            let capPaid = 0
            let intPaid = 0

            paymentsData?.forEach(p => {
                const amt = Number(p.amount)
                paidTotal += amt
                const type = (p.payment_type || '').toLowerCase().trim()
                if (['capital', 'principal', 'abono'].includes(type)) {
                    capPaid += amt
                } else {
                    intPaid += amt
                }
            })

            const balance = Math.max(0, principal - capPaid)
            const progress = principal > 0 ? Math.min((capPaid / principal) * 100, 100) : 0

            setStats({
                totalPrincipal: principal,
                totalInterest: intPaid,
                capitalPaid: capPaid,
                interestPaid: intPaid,
                amountPaid: paidTotal,
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
        { name: 'Capital Pagado', value: stats.capitalPaid, color: '#22c55e' }, // Green
        { name: 'Saldo Pendiente', value: stats.balance, color: '#d1d5db' } // Gray
    ]

    const barData = payments.map((p, i) => ({
        date: format(new Date(p.payment_date), 'dd/MM'),
        monto: Number(p.amount),
        type: p.payment_type === 'interest' ? 'Interés' : 'Capital'
    }))

    // Generate running balance for the table
    let currentBalance = stats.totalPrincipal
    const tableData = payments.map(p => {
        const amt = Number(p.amount)
        const type = (p.payment_type || '').toLowerCase().trim()
        const isCapital = ['capital', 'principal', 'abono'].includes(type)
        if (isCapital) {
            currentBalance -= amt
        }
        return {
            ...p,
            runningBalance: Math.max(0, currentBalance),
            isCapital
        }
    })

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
                <div className="grid grid-cols-4 gap-4 mb-12">
                    <div className="p-5 bg-slate-50 rounded-xl border border-slate-100">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Monto Inicial</p>
                        <div className="text-xl font-bold text-slate-900">${stats.totalPrincipal.toLocaleString()}</div>
                        <p className="text-[10px] text-slate-500 mt-1">
                            {format(new Date(loan.start_date), 'dd MMM yyyy')}
                        </p>
                    </div>
                    <div className="p-5 bg-emerald-50 rounded-xl border border-emerald-100">
                        <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-1">Abonado a Capital</p>
                        <div className="text-xl font-bold text-emerald-700">${stats.capitalPaid.toLocaleString()}</div>
                        <p className="text-[10px] text-emerald-600 mt-1">
                            {Math.round((stats.capitalPaid / stats.totalPrincipal) * 100)}% del total
                        </p>
                    </div>
                    <div className="p-5 bg-blue-50 rounded-xl border border-blue-100">
                        <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider mb-1">Saldo Pendiente</p>
                        <div className="text-2xl font-black text-blue-700">${stats.balance.toLocaleString()}</div>
                        <p className="text-[10px] text-blue-600 mt-1 font-bold italic">
                            Capital Real por pagar
                        </p>
                    </div>
                    <div className="p-5 bg-amber-50 rounded-xl border border-amber-100">
                        <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wider mb-1">Intereses Pagados</p>
                        <div className="text-xl font-bold text-amber-700">${stats.interestPaid.toLocaleString()}</div>
                        <p className="text-[10px] text-amber-600 mt-1">
                            Fuera del capital
                        </p>
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
                            <tr className="border-b-2 border-slate-200 uppercase text-[10px] tracking-widest text-slate-400">
                                <th className="py-4 font-black">Fecha</th>
                                <th className="py-4 font-black">Concepto</th>
                                <th className="py-4 font-black text-right">Monto</th>
                                <th className="py-4 font-black text-right pr-4">Saldo Restante</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {tableData.map((p) => (
                                <tr key={p.id} className={p.isCapital ? "bg-emerald-50/20" : ""}>
                                    <td className="py-4 text-slate-900 font-medium">
                                        {format(new Date(p.payment_date), 'dd/MM/yyyy')}
                                    </td>
                                    <td className="py-4">
                                        <div className="flex flex-col">
                                            <span className={`font-bold ${p.isCapital ? "text-emerald-600" : "text-slate-700"}`}>
                                                {p.payment_type === 'interest' ? 'Pago de Intereses' :
                                                    p.payment_type === 'capital' ? 'Abono a Capital' : 'Cuota General'}
                                            </span>
                                            {p.notes && <span className="text-[10px] text-slate-400">{p.notes}</span>}
                                        </div>
                                    </td>
                                    <td className={`py-4 font-bold text-right ${p.isCapital ? "text-emerald-600" : "text-slate-900"}`}>
                                        ${Number(p.amount).toLocaleString()}
                                    </td>
                                    <td className="py-4 text-slate-900 font-black text-right pr-4">
                                        ${p.runningBalance.toLocaleString()}
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
                            <tr className="border-t-2 border-slate-900 bg-slate-50">
                                <td colSpan={2} className="py-6 text-right font-black text-slate-900 uppercase pr-8">Resumen Final</td>
                                <td className="py-6 text-right font-bold text-slate-500 border-l border-slate-200 px-4">
                                    <div className="flex flex-col">
                                        <span className="text-[10px]">TOTAL PAGADO</span>
                                        <span className="text-lg text-slate-900">${stats.amountPaid.toLocaleString()}</span>
                                    </div>
                                </td>
                                <td className="py-6 text-right font-black text-slate-900 border-l border-slate-200 pr-4 pl-4 bg-slate-100">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] text-blue-600">DEUDA CAPITAL</span>
                                        <span className="text-2xl text-blue-700">${stats.balance.toLocaleString()}</span>
                                    </div>
                                </td>
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
