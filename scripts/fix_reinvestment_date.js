const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Target
const PAYOUT_ID = '4f07e930-d2eb-4e97-8a1b-b4ea72ba759c'; // Reinvestment transaction
const MARI_ID = '02e797c6-789f-4cc5-8e34-3fc11c13b20b'; // Mariangelica profile ID

async function main() {
    console.log('Logging in as admin...');
    const { data: authData, error: loginError } = await supabase.auth.signInWithPassword({
        email: 'lueddios17@gmail.com',
        password: 'Casablanca18@',
    });

    if (loginError) {
        console.error('Login failed:', loginError);
        return;
    }

    console.log(`Updating reinvestment ${PAYOUT_ID} date to 2026-05-13...`);

    const { data: updatedPayout, error: updateError } = await supabase
        .from('investor_payouts')
        .update({ date: '2026-05-13' })
        .eq('id', PAYOUT_ID)
        .select()
        .single();

    if (updateError) {
        console.error('Error updating payout date:', updateError);
        return;
    }

    console.log('Update successful! Recalculating wallets...');

    // 2. Fetch all loans
    const { data: loans } = await supabase.from('loans').select('*, client:clients(full_name)').eq('investor_id', MARI_ID);

    // 3. Fetch all payments
    const loanIds = loans.map(l => l.id);
    let payments = [];
    if (loanIds.length > 0) {
        const { data } = await supabase.from('payments').select('*, loan:loans(interest_rate, admin_fee_percent, client:clients(full_name))').in('loan_id', loanIds);
        payments = data || [];
    }

    // 4. Fetch all payouts
    const { data: payouts } = await supabase.from('investor_payouts').select('*').eq('investor_id', MARI_ID);

    // Chronological trace
    const events = [
        ...(loans || []).map(l => ({
            type: 'loan',
            date: new Date(l.start_date || l.created_at).getTime(),
            amount: Number(l.amount),
            label: `Loan to ${l.client?.full_name}`
        })),
        ...(payments || []).map(p => {
            const amt = Number(p.amount);
            let net = amt;
            const pType = (p.payment_type || '').toLowerCase().trim();
            const isCapital = ['capital', 'principal', 'abono'].includes(pType);
            
            if (!isCapital && amt > 0) {
                const feeRate = (Number(p.loan?.admin_fee_percent) || 40) / 100;
                net = amt - (amt * feeRate);
            }
            return {
                type: 'payment',
                date: new Date(p.payment_date).getTime(),
                amount: net,
                rawAmount: amt,
                isCapital: isCapital,
                label: `Payment from ${p.loan?.client?.full_name} (${p.payment_type})`
            };
        }),
        ...(payouts || []).map(p => ({
            type: 'payout',
            payoutType: p.type,
            source: p.fund_source || 'earnings',
            date: new Date(p.date).getTime(),
            amount: Number(p.amount),
            label: `${p.type.toUpperCase()} from ${p.fund_source}`
        }))
    ].sort((a, b) => a.date - b.date);

    let profitWallet = 0;
    let capitalWallet = 0;

    console.log('\nNEW CHRONOLOGICAL WALLET IMPACT TRACE:');
    events.forEach(e => {
        const dateStr = new Date(e.date).toISOString().split('T')[0];
        const prevCap = capitalWallet;
        const prevProf = profitWallet;

        if (e.type === 'payment') {
            if (e.isCapital) {
                capitalWallet += e.amount;
            } else {
                profitWallet += e.amount;
            }
        } else if (e.type === 'payout') {
            if (e.payoutType === 'reinvestment') {
                profitWallet -= e.amount;
                capitalWallet += e.amount;
            } else if (e.payoutType === 'injection') {
                if (e.source === 'capital') {
                    capitalWallet += e.amount;
                } else {
                    profitWallet += e.amount;
                }
            } else {
                if (e.source === 'capital') {
                    capitalWallet -= e.amount;
                } else {
                    profitWallet -= e.amount;
                }
            }
        } else if (e.type === 'loan') {
            if (capitalWallet >= e.amount) {
                capitalWallet -= e.amount;
            } else {
                capitalWallet = 0;
            }
        }

        console.log(`[${dateStr}] ${e.label.padEnd(45)} | Cap: $${prevCap.toLocaleString()} -> $${capitalWallet.toLocaleString()} | Profit: $${prevProf.toLocaleString()} -> $${profitWallet.toLocaleString()}`);
    });

    console.log('\n--- NEW FINAL STATE ---');
    console.log(`Capital Wallet (Disponible): $${capitalWallet.toLocaleString()}`);
    console.log(`Profit Wallet (Ganancias): $${profitWallet.toLocaleString()}`);
    console.log(`Total Disponible: $${(capitalWallet + profitWallet).toLocaleString()}`);
}

main();
