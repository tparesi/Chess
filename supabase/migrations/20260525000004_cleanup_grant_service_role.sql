-- Grant service_role execute on cleanup_stale_games so the GitHub Actions
-- workflow can call it via the REST API using the service_role key.
grant execute on function cleanup_stale_games(int) to service_role;
