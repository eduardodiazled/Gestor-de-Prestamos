import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

async function main() {
    // 1. Get all investors
    const { data: investors } = await supabase.from('profiles').select('*').in('role', ['investor', 'admin'])

    // 2. Get all loans
    const { data: loans } = await supabase.from('loans').select('*, client:clients(full_name)')

    // 3. Get all payments
    const { data: payments } = await supabase.from('payments').select('*, loan:loans(investor_id, admin_fee_percent, amount)')

    // 4. Get all payouts
    const { data: payouts } = await supabase.from('investor_payouts').select('*')

    console.log('\n========================================')
    console.log('  REPORTE COMPLETO DE BOLSILLOS')
    console.log('========================================\n')

    // Per-investor breakdown
    let totalAdminEarnings = 0

    for (const inv of (investors || [])) {
        const invLoans = (loans || []).filter(l => l.investor_id === inv.id)
        const invLoanIds = invLoans.map(l => l.id)
        const invPayments = (payments || []).filter(p => invLoanIds.includes(p.loan_id))
        const invPayouts = (payouts || []).filter(p => p.investor_id === inv.id)

        let interestEarned = 0  // Gross interest collected
        let investorShare = 0   // 60% (investor's net)
        let adminShare = 0      // 40% (Eduardo's cut)
        let capitalReturned = 0 // Capital paid back by clients
        let activeCapital = 0   // Money currently lent out
        let totalPayouts = 0    // Retiros
        let totalReinvested = 0 // Reinversiones

        // Loans
        console.log(`\n--- ${inv.full_name || inv.email} (${inv.role}) ---`)
        console.log(`Préstamos:`)
        for (const l of invLoans) {
            const status = l.status === 'active' ? '🟢 Activo' : (l.status === 'paid' ? '✅ Pagado' : `⚠️ ${l.status}`)
            console.log(`  ${status} | ${l.client?.full_name || 'N/A'} | $${Number(l.amount).toLocaleString()} | Inicio: ${l.start_date}`)
            if (l.status === 'active' || l.status === 'defaulted') {
                activeCapital += Number(l.amount)
            }
        }

        // Payments
        console.log(`\nPagos recibidos:`)
        for (const p of invPayments) {
            const amt = Number(p.amount)
            const adminRate = (Number(p.loan?.admin_fee_percent) || 40) / 100

            if (p.payment_type === 'interest' || p.payment_type === 'fee') {
                const invCut = amt * (1 - adminRate)
                const admCut = amt * adminRate
                interestEarned += amt
                investorShare += invCut
                adminShare += admCut
                console.log(`  💰 Interés | $${amt.toLocaleString()} bruto | Socia: $${invCut.toLocaleString()} | Admin: $${admCut.toLocaleString()} | Fecha: ${p.payment_date}`)
            } else if (p.payment_type === 'capital' || p.payment_type === 'principal') {
                capitalReturned += amt
                console.log(`  🔵 Capital | $${amt.toLocaleString()} devuelto | Fecha: ${p.payment_date}`)
            }
        }

        // Payouts
        console.log(`\nRetiros/Reinversiones:`)
        for (const p of invPayouts) {
            const amt = Number(p.amount)
            if (p.type === 'reinvestment') {
                totalReinvested += amt
                console.log(`  🔄 Reinversión | -$${amt.toLocaleString()} | ${p.notes || ''} | ${p.date || p.created_at}`)
            } else {
                totalPayouts += amt
                console.log(`  💸 Retiro | -$${amt.toLocaleString()} | ${p.notes || ''} | ${p.date || p.created_at}`)
            }
        }
        if (invPayouts.length === 0) console.log('  (ninguno)')

        totalAdminEarnings += adminShare

        // Summary
        console.log(`\n📊 RESUMEN ${inv.full_name}:`)
        console.log(`  Bolsillo GANANCIAS INTERESES = $${(investorShare - totalPayouts - totalReinvested).toLocaleString()}`)
        console.log(`    (Ganancia neta: $${investorShare.toLocaleString()} - Retiros: $${totalPayouts.toLocaleString()} - Reinversiones: $${totalReinvested.toLocaleString()})`)
        console.log(`  Bolsillo CAPITAL = $${capitalReturned.toLocaleString()} (devuelto por clientes)`)
        console.log(`  Capital Activo (en calle) = $${activeCapital.toLocaleString()}`)
    }

    console.log(`\n========================================`)
    console.log(`🟢 BOLSILLO GANANCIAS EDUARDO (Admin):`)
    console.log(`  Total: $${totalAdminEarnings.toLocaleString()}`)
    console.log(`========================================\n`)
}

main().catch(console.error)
