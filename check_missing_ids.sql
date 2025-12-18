-- Check for clients with missing/empty document_id or weird values
SELECT id, full_name, document_id, email, address 
FROM public.clients
WHERE document_id IS NULL 
   OR document_id = '' 
   OR document_id = 'N/A'
   OR length(document_id) < 5;
