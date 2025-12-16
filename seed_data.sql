-- SEED DATA GENERATED FROM CSV
-- Date: 2025-12-15T04:32:08.467Z

-- 1. PROFILES
INSERT INTO public.profiles (id, email, full_name, role) VALUES 
('869a2e83-917e-43a8-94a7-48f77b677449', 'admin@prestamos.com', 'Admin Principal', 'admin');
INSERT INTO public.profiles (id, email, full_name, role) VALUES ('7466bc44-c8a7-4672-8f77-f05e838dcf63', 'mariangelica@socias.com', 'Mariangelica', 'investor');
INSERT INTO public.profiles (id, email, full_name, role) VALUES ('2f76af1a-c922-48fc-bdd6-1bf380df36bd', 'herminia@socias.com', 'Herminia', 'investor');
INSERT INTO public.clients (id, full_name, document_id) VALUES ('0d68a3e1-a349-4d31-afe1-3608299d7de8', 'Jener Martinez', 'DOC-34795');
INSERT INTO public.clients (id, full_name, document_id) VALUES ('382fa5d9-111d-4350-8624-b61d4ea50e92', 'Carlos Vanegas', 'DOC-6469');
INSERT INTO public.clients (id, full_name, document_id) VALUES ('860a5232-7f29-4c12-92eb-b7ba82915274', 'Jhonger Davila', 'DOC-16998');
INSERT INTO public.clients (id, full_name, document_id) VALUES ('b0d6393b-779e-4f72-8480-8267d82f3551', 'Ludys Ospino', 'DOC-17329');
INSERT INTO public.clients (id, full_name, document_id) VALUES ('3e5fd579-aea0-4ad7-bb9b-8e2fab26c6d9', 'Julio Diaz', 'DOC-33267');
INSERT INTO public.clients (id, full_name, document_id) VALUES ('f1a17008-be65-45c6-90cc-2af8ada5207d', 'Eleixer Beleño', 'DOC-43676');

-- 3. LOANS
INSERT INTO public.loans (id, legacy_id, client_id, investor_id, amount, interest_rate, start_date, cutoff_day, status) VALUES 
    ('bccf952e-3d44-4358-bcc8-715897f0c90f', 1, '0d68a3e1-a349-4d31-afe1-3608299d7de8', '7466bc44-c8a7-4672-8f77-f05e838dcf63', 2000000, 10, '2025-08-29', 15, 'active');
INSERT INTO public.loans (id, legacy_id, client_id, investor_id, amount, interest_rate, start_date, cutoff_day, status) VALUES 
    ('8460b534-4820-4bcf-ab90-04eb869b63c7', 2, '382fa5d9-111d-4350-8624-b61d4ea50e92', '7466bc44-c8a7-4672-8f77-f05e838dcf63', 1600000, 10, '2025-09-05', 15, 'active');
INSERT INTO public.loans (id, legacy_id, client_id, investor_id, amount, interest_rate, start_date, cutoff_day, status) VALUES 
    ('8ef5db2b-465d-456a-b1fc-f21399c3378a', 3, '860a5232-7f29-4c12-92eb-b7ba82915274', '2f76af1a-c922-48fc-bdd6-1bf380df36bd', 5000000, 10, '2025-10-11', 15, 'defaulted');
INSERT INTO public.loans (id, legacy_id, client_id, investor_id, amount, interest_rate, start_date, cutoff_day, status) VALUES 
    ('411a6388-b03e-46a1-9991-3537d213f63a', 4, 'b0d6393b-779e-4f72-8480-8267d82f3551', '2f76af1a-c922-48fc-bdd6-1bf380df36bd', 500000, 10, '2025-10-15', 15, 'paid');
INSERT INTO public.loans (id, legacy_id, client_id, investor_id, amount, interest_rate, start_date, cutoff_day, status) VALUES 
    ('eb685726-d797-4869-b114-66cfd7382692', 5, '3e5fd579-aea0-4ad7-bb9b-8e2fab26c6d9', '7466bc44-c8a7-4672-8f77-f05e838dcf63', 1000000, 10, '2025-11-07', 15, 'defaulted');
INSERT INTO public.loans (id, legacy_id, client_id, investor_id, amount, interest_rate, start_date, cutoff_day, status) VALUES 
    ('3637094a-98a3-44a1-a933-72fca8b61d49', 6, 'f1a17008-be65-45c6-90cc-2af8ada5207d', '7466bc44-c8a7-4672-8f77-f05e838dcf63', 1000000, 10, '2025-11-07', 15, 'defaulted');

-- 4. PAYMENTS
INSERT INTO public.payments (loan_id, amount, payment_date, payment_type, notes, is_late, late_fee_waived) VALUES 
    ('bccf952e-3d44-4358-bcc8-715897f0c90f', 200000, '2025-09-29', 'interest', 'Mora de 7 días perdonada ', true, true);
INSERT INTO public.payments (loan_id, amount, payment_date, payment_type, notes, is_late, late_fee_waived) VALUES 
    ('8460b534-4820-4bcf-ab90-04eb869b63c7', 160000, '2025-10-03', 'interest', 'Mora perdonada', true, true);
INSERT INTO public.payments (loan_id, amount, payment_date, payment_type, notes, is_late, late_fee_waived) VALUES 
    ('bccf952e-3d44-4358-bcc8-715897f0c90f', 200000, '2025-10-31', 'interest', '', false, false);
INSERT INTO public.payments (loan_id, amount, payment_date, payment_type, notes, is_late, late_fee_waived) VALUES 
    ('8460b534-4820-4bcf-ab90-04eb869b63c7', 160000, '2025-11-03', 'interest', '', false, false);
INSERT INTO public.payments (loan_id, amount, payment_date, payment_type, notes, is_late, late_fee_waived) VALUES 
    ('411a6388-b03e-46a1-9991-3537d213f63a', 50000, '2025-11-11', 'interest', '', false, false);
INSERT INTO public.payments (loan_id, amount, payment_date, payment_type, notes, is_late, late_fee_waived) VALUES 
    ('411a6388-b03e-46a1-9991-3537d213f63a', 500000, '2025-11-11', 'capital', '', false, false);
INSERT INTO public.payments (loan_id, amount, payment_date, payment_type, notes, is_late, late_fee_waived) VALUES 
    ('8ef5db2b-465d-456a-b1fc-f21399c3378a', 500000, '2025-11-13', 'interest', '', false, false);
INSERT INTO public.payments (loan_id, amount, payment_date, payment_type, notes, is_late, late_fee_waived) VALUES 
    ('bccf952e-3d44-4358-bcc8-715897f0c90f', 200000, '2025-12-01', 'interest', '', false, false);
INSERT INTO public.payments (loan_id, amount, payment_date, payment_type, notes, is_late, late_fee_waived) VALUES 
    ('8460b534-4820-4bcf-ab90-04eb869b63c7', 160000, '2025-12-05', 'interest', '', false, false);
