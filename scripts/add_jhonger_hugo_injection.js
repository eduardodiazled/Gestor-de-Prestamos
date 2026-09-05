const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const JHONGER_ID = '477e4c55-88f5-44c3-bcdc-38fa68508a1a';

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

    console.log(`Inserting second injection of $5,000,000 for Jhonger Davila (Hugo Diaz loan)...`);

    const { data: newPayout, error: insertError } = await supabase
        .from('investor_payouts')
        .insert({
            investor_id: JHONGER_ID,
            amount: 5000000,
            type: 'injection',
            fund_source: 'capital',
            date: '2026-05-14', // matching Hugo's loan date
            notes: 'Aporte de capital externo para crédito Hugo Diaz'
        })
        .select()
        .single();

    if (insertError) {
        console.error('Error inserting payout:', insertError);
        return;
    }

    console.log('Injection registered successfully! Details:');
    console.log(newPayout);

    // Verify Jhonger's balance now
    console.log('\nRecalculating Jhonger Davila\'s wallet balances...');
    
    // Fetch all his loans
    const { data: loans } = await supabase.from('loans').select('*').eq('investor_id', JHONGER_ID);
    const loanIds = loans.map(l => l.id);
    let payments = [];
    if (loanIds.length > 0) {
        const { data } = await supabase.from('payments').select('*').in('loan_id', loanIds);
        payments = data || [];
    }
    const { data: payouts } = await supabase.from('investor_payouts').select('*').eq('investor_id', JHONGER_ID);

    // Calculate
    const events = [
        ...(loans || []).map(l => ({
            type: 'loan',
            date: new Date(l.start_date || l.created_at).getTime(),
            amount: Number(l.amount)
        })),
        ...(payments || []).map(p => {
            const amt = Number(p.amount);
            let net = amt;
            const pType = (p.payment_type || '').toLowerCase().trim();
            const isCapital = ['capital', 'principal', 'abono'].includes(pType);
            
            if (!isCapital && amt > 0) {
                const lMatch = loans.find(l => l.id === p.loan_id);
                const feeRate = (Number(lMatch?.admin_fee_percent) || 40) / 100;
                net = amt - (amt * feeRate);
            }
            return {
                type: 'payment',
                date: new Date(p.payment_date).getTime(),
                amount: net,
                isCapital: isCapital
            };
        }),
        ...(payouts || []).map(p => ({
            type: 'payout',
            payoutType: p.type,
            source: p.fund_source || 'earnings',
            date: new Date(p.date).getTime(),
            amount: Number(p.amount)
        }))
    ].sort((a, b) => a.date - b.date);

    let profitWallet = 0;
    let capitalWallet = 0;

    events.forEach(e => {
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
    });

    console.log(`\n--- JHONGER DAVILA NEW STATE ---`);
    console.log(`Capital Wallet (Disponible): $${capitalWallet.toLocaleString()}`);
    console.log(`Profit Wallet (Ganancias): $${profitWallet.toLocaleString()}`);
    console.log(`Total Disponible: $${(capitalWallet + profitWallet).toLocaleString()}`);
}

main();
