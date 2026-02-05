import { NextResponse } from 'next/server';
import { openApiSpec } from '@/lib/api-docs';

export const dynamic = 'force-static';

// GET - Restituisce la specifica OpenAPI
export async function GET() {
  return NextResponse.json(openApiSpec);
}
