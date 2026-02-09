// Documentazione API OpenAPI/Swagger
// Questo file definisce la specifica OpenAPI per le API dell'applicazione

export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Bitora - Gestione Rapportini API',
    description: 'API per la gestione dei rapportini di intervento su stufe a pellet e legno',
    version: '1.0.0',
    contact: {
      name: 'Bitora.it',
      url: 'https://bitora.it',
    },
  },
  servers: [
    {
      url: '/api',
      description: 'Server principale',
    },
  ],
  tags: [
    { name: 'Auth', description: 'Autenticazione e gestione sessioni' },
    { name: 'Rapportini', description: 'Gestione rapportini di intervento' },
    { name: 'Users', description: 'Gestione utenti (solo admin)' },
    { name: 'Clienti', description: 'Gestione clienti' },
    { name: 'Catalogo', description: 'Marche, modelli e materiali' },
    { name: 'Statistics', description: 'Statistiche e report' },
    { name: 'Email', description: 'Invio notifiche email' },
  ],
  paths: {
    '/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Login utente',
        description: 'Autentica un utente e restituisce i token JWT',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['username', 'password'],
                properties: {
                  username: { type: 'string', example: 'admin' },
                  password: { type: 'string', example: 'password123' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Login effettuato con successo',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    user: { $ref: '#/components/schemas/User' },
                    accessToken: { type: 'string' },
                    refreshToken: { type: 'string' },
                  },
                },
              },
            },
          },
          '401': { description: 'Credenziali non valide' },
          '429': { description: 'Troppi tentativi di login' },
        },
      },
    },
    '/auth/logout': {
      post: {
        tags: ['Auth'],
        summary: 'Logout utente',
        description: 'Termina la sessione e invalida i token',
        responses: {
          '200': { description: 'Logout effettuato con successo' },
        },
      },
    },
    '/auth/refresh': {
      post: {
        tags: ['Auth'],
        summary: 'Refresh token',
        description: 'Rinnova i token JWT usando il refresh token',
        responses: {
          '200': {
            description: 'Token rinnovati con successo',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    accessToken: { type: 'string' },
                    refreshToken: { type: 'string' },
                  },
                },
              },
            },
          },
          '401': { description: 'Refresh token non valido' },
        },
      },
    },
    '/rapportini': {
      get: {
        tags: ['Rapportini'],
        summary: 'Lista rapportini',
        description: 'Ottiene la lista dei rapportini con paginazione e filtri',
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20, maximum: 100 } },
          { name: 'tipoStufa', in: 'query', schema: { type: 'string', enum: ['pellet', 'legno'] } },
          { name: 'dataInizio', in: 'query', schema: { type: 'string', format: 'date' } },
          { name: 'dataFine', in: 'query', schema: { type: 'string', format: 'date' } },
          { name: 'marca', in: 'query', schema: { type: 'string' } },
          { name: 'modello', in: 'query', schema: { type: 'string' } },
          { name: 'search', in: 'query', schema: { type: 'string' } },
        ],
        responses: {
          '200': {
            description: 'Lista rapportini',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Rapportino' },
                    },
                    pagination: { $ref: '#/components/schemas/Pagination' },
                  },
                },
              },
            },
          },
          '401': { description: 'Non autenticato' },
        },
        security: [{ bearerAuth: [] }],
      },
      post: {
        tags: ['Rapportini'],
        summary: 'Crea rapportino',
        description: 'Crea un nuovo rapportino di intervento',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/RapportinoInput' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Rapportino creato',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    id: { type: 'string', format: 'uuid' },
                    success: { type: 'boolean' },
                  },
                },
              },
            },
          },
          '400': { description: 'Dati non validi' },
          '401': { description: 'Non autenticato' },
          '403': { description: 'Non autorizzato (solo operatori)' },
        },
        security: [{ bearerAuth: [] }],
      },
    },
    '/rapportini/{id}': {
      get: {
        tags: ['Rapportini'],
        summary: 'Dettaglio rapportino',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          '200': {
            description: 'Dettaglio rapportino',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Rapportino' },
              },
            },
          },
          '404': { description: 'Rapportino non trovato' },
        },
        security: [{ bearerAuth: [] }],
      },
      delete: {
        tags: ['Rapportini'],
        summary: 'Elimina rapportino',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          '200': { description: 'Rapportino eliminato' },
          '404': { description: 'Rapportino non trovato' },
        },
        security: [{ bearerAuth: [] }],
      },
    },
    '/users': {
      get: {
        tags: ['Users'],
        summary: 'Lista utenti',
        description: 'Ottiene la lista di tutti gli utenti (solo admin)',
        responses: {
          '200': {
            description: 'Lista utenti',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/User' },
                    },
                  },
                },
              },
            },
          },
          '403': { description: 'Non autorizzato' },
        },
        security: [{ bearerAuth: [] }],
      },
      post: {
        tags: ['Users'],
        summary: 'Crea utente',
        description: 'Crea un nuovo utente (solo admin)',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/UserInput' },
            },
          },
        },
        responses: {
          '201': { description: 'Utente creato' },
          '400': { description: 'Dati non validi' },
          '403': { description: 'Non autorizzato' },
        },
        security: [{ bearerAuth: [] }],
      },
    },
    '/admin/statistics': {
      get: {
        tags: ['Statistics'],
        summary: 'Statistiche clienti',
        description: 'Ottiene le statistiche raggruppate per cliente (solo admin)',
        responses: {
          '200': {
            description: 'Statistiche',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/ClienteStatistiche' },
                },
              },
            },
          },
          '403': { description: 'Non autorizzato' },
        },
        security: [{ bearerAuth: [] }],
      },
    },
    '/email/send': {
      post: {
        tags: ['Email'],
        summary: 'Invia email conferma',
        description: 'Invia email di conferma intervento al cliente',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['rapportino'],
                properties: {
                  rapportino: { $ref: '#/components/schemas/Rapportino' },
                  aziendaNome: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Email inviata' },
          '400': { description: 'Email cliente non disponibile' },
          '500': { description: 'Errore invio email' },
        },
        security: [{ bearerAuth: [] }],
      },
    },
  },
  components: {
    schemas: {
      User: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          username: { type: 'string' },
          ruolo: { type: 'string', enum: ['admin', 'operatore'] },
          nome: { type: 'string' },
          cognome: { type: 'string' },
          telefono: { type: 'string' },
          email: { type: 'string', format: 'email' },
          qualifica: { type: 'string' },
          attivo: { type: 'boolean' },
        },
      },
      UserInput: {
        type: 'object',
        required: ['username', 'password', 'nome', 'cognome'],
        properties: {
          username: { type: 'string', minLength: 3 },
          password: { type: 'string', minLength: 8 },
          nome: { type: 'string' },
          cognome: { type: 'string' },
          email: { type: 'string', format: 'email' },
          telefono: { type: 'string' },
          qualifica: { type: 'string' },
          ruolo: { type: 'string', enum: ['admin', 'operatore'], default: 'operatore' },
        },
      },
      Cliente: {
        type: 'object',
        properties: {
          nome: { type: 'string' },
          cognome: { type: 'string' },
          ragioneSociale: { type: 'string' },
          indirizzo: { type: 'string' },
          citta: { type: 'string' },
          cap: { type: 'string' },
          telefono: { type: 'string' },
          email: { type: 'string', format: 'email' },
          partitaIva: { type: 'string' },
          codiceFiscale: { type: 'string' },
        },
      },
      Intervento: {
        type: 'object',
        properties: {
          data: { type: 'string', format: 'date' },
          ora: { type: 'string' },
          tipoStufa: { type: 'string', enum: ['pellet', 'legno'] },
          marca: { type: 'string' },
          modello: { type: 'string' },
          numeroSerie: { type: 'string' },
          tipoIntervento: { type: 'string' },
          descrizione: { type: 'string' },
          materialiUtilizzati: { type: 'string' },
          note: { type: 'string' },
        },
      },
      Rapportino: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          operatore: { $ref: '#/components/schemas/User' },
          cliente: { $ref: '#/components/schemas/Cliente' },
          intervento: { $ref: '#/components/schemas/Intervento' },
          dataCreazione: { type: 'string', format: 'date-time' },
        },
      },
      RapportinoInput: {
        type: 'object',
        required: ['cliente', 'intervento'],
        properties: {
          cliente: { $ref: '#/components/schemas/Cliente' },
          intervento: { $ref: '#/components/schemas/Intervento' },
        },
      },
      Pagination: {
        type: 'object',
        properties: {
          page: { type: 'integer' },
          limit: { type: 'integer' },
          total: { type: 'integer' },
          totalPages: { type: 'integer' },
          hasNext: { type: 'boolean' },
          hasPrev: { type: 'boolean' },
        },
      },
      ClienteStatistiche: {
        type: 'object',
        properties: {
          cliente: { $ref: '#/components/schemas/Cliente' },
          rapportini: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                dataIntervento: { type: 'string' },
                tipoStufa: { type: 'string' },
                tipoIntervento: { type: 'string' },
              },
            },
          },
          statistiche: {
            type: 'object',
            properties: {
              totale: { type: 'integer' },
              pellet: { type: 'integer' },
              legno: { type: 'integer' },
              primoIntervento: { type: 'string' },
              ultimoIntervento: { type: 'string' },
              tipiIntervento: { type: 'object' },
            },
          },
        },
      },
    },
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
  },
};

// Endpoint per servire la documentazione
export function getOpenApiJson(): string {
  return JSON.stringify(openApiSpec, null, 2);
}
