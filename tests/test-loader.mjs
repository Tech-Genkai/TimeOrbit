import { pathToFileURL, fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import ts from 'typescript';

const projectRoot = path.resolve(process.cwd());

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith('next/') && !specifier.endsWith('.js')) {
    return nextResolve(specifier + '.js', context);
  }
  if (specifier.startsWith('@/')) {
    const subpath = specifier.slice(2);
    const tsPath = path.join(projectRoot, 'src', subpath + '.ts');
    const tsxPath = path.join(projectRoot, 'src', subpath + '.tsx');
    const indexPath = path.join(projectRoot, 'src', subpath, 'index.ts');
    const directPath = path.join(projectRoot, 'src', subpath);

    if (fs.existsSync(tsPath)) {
      return { url: pathToFileURL(tsPath).href, shortCircuit: true };
    }
    if (fs.existsSync(tsxPath)) {
      return { url: pathToFileURL(tsxPath).href, shortCircuit: true };
    }
    if (fs.existsSync(indexPath)) {
      return { url: pathToFileURL(indexPath).href, shortCircuit: true };
    }
    if (fs.existsSync(directPath)) {
      return { url: pathToFileURL(directPath).href, shortCircuit: true };
    }
  }

  // Handle local relative imports missing extension in TS files
  if (specifier.startsWith('./') || specifier.startsWith('../')) {
    if (context.parentURL) {
      const parentDir = path.dirname(fileURLToPath(context.parentURL));
      const candidateTs = path.join(parentDir, specifier + '.ts');
      const candidateTsx = path.join(parentDir, specifier + '.tsx');
      const candidateIndexTs = path.join(parentDir, specifier, 'index.ts');
      if (fs.existsSync(candidateTs)) {
        return { url: pathToFileURL(candidateTs).href, shortCircuit: true };
      }
      if (fs.existsSync(candidateTsx)) {
        return { url: pathToFileURL(candidateTsx).href, shortCircuit: true };
      }
      if (fs.existsSync(candidateIndexTs)) {
        return { url: pathToFileURL(candidateIndexTs).href, shortCircuit: true };
      }
    }
  }

  return nextResolve(specifier, context);
}

export async function load(url, context, nextLoad) {
  const normUrl = url.replace(/\\/g, '/');

  if (normUrl.includes('/src/lib/mongodb.ts')) {
    return {
      format: 'module',
      source: `
        export async function connectToDatabase() {
          if (globalThis.__mockConnectToDatabase) {
            return globalThis.__mockConnectToDatabase();
          }
          return Promise.resolve();
        }
      `,
      shortCircuit: true,
    };
  }

  if (normUrl.includes('/src/lib/apiKey.ts') && process.env.MOCK_API_KEY === '1') {
    return {
      format: 'module',
      source: `
        export async function validateApiKey(key) {
          if (globalThis.__mockValidateApiKey) {
            return globalThis.__mockValidateApiKey(key);
          }
          return { valid: false, statusCode: 401, reason: 'Invalid API key.' };
        }
        export function hashApiKey(key) {
          return key;
        }
        export function generateApiKey() {
          return { rawKey: 'mock', keyPrefix: 'mock...', keyHash: 'mock', lastFour: 'mock' };
        }
        export async function checkRateLimit(keyId, limit = 60) {
          if (globalThis.__mockCheckRateLimit) {
            return globalThis.__mockCheckRateLimit(keyId, limit);
          }
          return { allowed: true, remaining: limit - 1, resetInSeconds: 60 };
        }
      `,
      shortCircuit: true,
    };
  }

  if (normUrl.includes('/src/lib/auth.ts')) {
    return {
      format: 'module',
      source: `
        export async function getSessionUser() {
          if (globalThis.__mockGetSessionUser) {
            return globalThis.__mockGetSessionUser();
          }
          return null;
        }
        export async function requireAuth() {
          const user = await getSessionUser();
          if (!user) throw new Error('Unauthorized');
          return user;
        }
        export async function requireAdmin() {
          const user = await requireAuth();
          if (user.role !== 'admin') throw new Error('Forbidden: Admin access required');
          return user;
        }
        export function signJwtToken(payload) {
          return 'mock-jwt-token';
        }
        export function verifyJwtToken(token) {
          return null;
        }
        export const AUTH_COOKIE_NAME = 'timeorbit_token';
      `,
      shortCircuit: true,
    };
  }

  if (url.startsWith('file:') && (url.endsWith('.ts') || url.endsWith('.tsx'))) {
    const filePath = fileURLToPath(url);
    const rawSource = fs.readFileSync(filePath, 'utf8');
    const transpiled = ts.transpileModule(rawSource, {
      compilerOptions: {
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ES2022,
        moduleResolution: ts.ModuleResolutionKind.NodeNext,
        esModuleInterop: true,
      },
      fileName: filePath,
    });

    return {
      format: 'module',
      source: transpiled.outputText,
      shortCircuit: true,
    };
  }

  return nextLoad(url, context);
}
