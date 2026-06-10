import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { registerSchema, validateRequest } from '@/lib/validation';
import { getOrgIdFromRequest } from '@/lib/api-auth';
import { isCatAdmin, isOrgAdminRole, isPlatformAdmin } from '@/lib/roles';
import { getCatOrgLabels, getPlatformAdminVisibleOrgIds } from '@/lib/user-scope';

export const dynamic = 'force-dynamic';

const userSelectPublic = {
  id: true,
  org_id: true,
  username: true,
  ruolo: true,
  nome: true,
  cognome: true,
  telefono: true,
  email: true,
  qualifica: true,
  firma: true,
  attivo: true,
  ultimo_accesso: true,
  created_at: true,
} as const;

// GET - Ottieni tutti gli utenti (solo admin)
export async function GET(request: NextRequest) {
  try {
    const userRole = request.headers.get('x-user-ruolo');
    const orgId = getOrgIdFromRequest(request);

    if (!isOrgAdminRole(userRole)) {
      return NextResponse.json({ error: 'Accesso non autorizzato' }, { status: 403 });
    }

    const visibleOrgIds = isPlatformAdmin(userRole)
      ? await getPlatformAdminVisibleOrgIds(orgId)
      : [orgId];

    const utenti = await prisma.utenti.findMany({
      where: { org_id: { in: visibleOrgIds } },
      orderBy: { created_at: 'desc' },
      select: userSelectPublic,
    });

    if (!isPlatformAdmin(userRole)) {
      const data = utenti.map(({ org_id: _orgId, ...user }) => user);
      return NextResponse.json({ data });
    }

    const orgLabels = await getCatOrgLabels(visibleOrgIds);
    const data = utenti.map((user) => ({
      ...user,
      organizzazione:
        user.org_id === orgId
          ? null
          : orgLabels.get(user.org_id) ?? user.org_id,
    }));

    return NextResponse.json({ data });
  } catch (error: unknown) {
    console.error('Error fetching users:', error);
    const message = error instanceof Error ? error.message : 'Errore nel recupero degli utenti';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST - Crea nuovo utente (solo admin)
export async function POST(request: NextRequest) {
  try {
    const userRole = request.headers.get('x-user-ruolo');
    const orgId = getOrgIdFromRequest(request);

    if (!isOrgAdminRole(userRole)) {
      return NextResponse.json({ error: 'Accesso non autorizzato' }, { status: 403 });
    }

    const body = await request.json();

    const validation = validateRequest(registerSchema, body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.errors.join(', ') }, { status: 400 });
    }

    const { username, password, nome, cognome, email, telefono, qualifica, ruolo, firma } = validation.data as {
      username: string;
      password: string;
      nome: string;
      cognome: string;
      email?: string | null;
      telefono?: string;
      qualifica?: string;
      ruolo: 'admin' | 'admin_cat' | 'operatore';
      firma?: string;
    };

    if (isCatAdmin(userRole) && ruolo !== 'operatore') {
      return NextResponse.json(
        { error: 'Gli amministratori CAT possono creare solo operatori' },
        { status: 403 }
      );
    }

    const existingUser = await prisma.utenti.findFirst({
      where: { username, org_id: orgId },
      select: { id: true },
    });

    if (existingUser) {
      return NextResponse.json({ error: 'Username già in uso' }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const newUser = await prisma.utenti.create({
      data: {
        username,
        password_hash: passwordHash,
        nome,
        cognome,
        email: email || null,
        telefono: telefono || null,
        qualifica: qualifica || null,
        firma: firma || null,
        ruolo,
        org_id: orgId,
        attivo: true,
        must_change_password: false,
      },
      select: {
        id: true,
        username: true,
        ruolo: true,
        nome: true,
        cognome: true,
        telefono: true,
        email: true,
        qualifica: true,
        firma: true,
        attivo: true,
      },
    });

    return NextResponse.json({ data: newUser, success: true }, { status: 201 });
  } catch (error: unknown) {
    console.error('Error creating user:', error);
    const message = error instanceof Error ? error.message : "Errore nella creazione dell'utente";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
