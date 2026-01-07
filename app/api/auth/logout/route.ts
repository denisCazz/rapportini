import { NextResponse } from 'next/server';

// POST - Logout utente
export async function POST() {
  // Il logout è gestito lato client rimuovendo il token
  // Questa route può essere usata per invalidare sessioni lato server in futuro
  return NextResponse.json({ success: true });
}

