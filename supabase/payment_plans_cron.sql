-- Enable Supabase Cron (pg_cron) first, then run this as postgres in SQL Editor.
-- https://supabase.com/docs/guides/cron/quickstart
-- Every five minutes, including when the app is closed. Due dates use Malaysia time.
select cron.schedule('post-payment-installments', '*/5 * * * *',
  $$select public.process_due_payment_installments();$$);
