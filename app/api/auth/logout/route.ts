import { NextResponse } from 'next/server';

// POST - Logout utente
export async function POST() {
  const response = NextResponse.json({ success: true });
  
  // Cancella i cookie di autenticazione
  response.cookies.delete('access_token');
  response.cookies.delete('refresh_token');
  
  return response;
}

