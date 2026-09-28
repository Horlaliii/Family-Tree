-- Functions created after the privacy migration still got Postgres's
-- built-in EXECUTE-to-PUBLIC grant (per-schema default privileges can't
-- remove it), so anon could call them. Every role that needs a function
-- has its own explicit grant, so take PUBLIC and anon off everything.
revoke execute on all functions in schema public from public, anon;
