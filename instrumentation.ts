export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  const { syncDatabaseSchema } = await import('@/lib/db-schema-sync');
  await syncDatabaseSchema();
}
