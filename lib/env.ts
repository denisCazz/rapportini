const MIN_JWT_SECRET_LENGTH = 32;

export function getRequiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Variabile d'ambiente mancante: ${name}`);
  }
  return value;
}

export function getJwtSecretValue(): string {
  const secret = getRequiredEnv('JWT_SECRET');
  if (secret.length < MIN_JWT_SECRET_LENGTH) {
    throw new Error(`JWT_SECRET deve avere almeno ${MIN_JWT_SECRET_LENGTH} caratteri.`);
  }
  return secret;
}
