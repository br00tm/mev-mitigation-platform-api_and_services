// UUID utilities usando crypto.randomUUID() nativo
export const generateId = (): string => {
  // Fallback simples para UUID v4 se crypto.randomUUID não estiver disponível
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback manual
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

export const isValidUuid = (id: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
};

// Hash utilities - versão simples síncrona para ambiente Node.js
export const generateCommitmentHash = (transactionData: string, nonce: string): string => {
  // Implementação simples de hash para desenvolvimento
  // Em produção, usar uma biblioteca criptográfica adequada
  const input = transactionData + nonce;
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
};

// Hash utilities usando Web Crypto API (versão assíncrona)
export const generateCommitmentHashAsync = async (transactionData: string, nonce: string): Promise<string> => {
  const data = new TextEncoder().encode(transactionData + nonce);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

export const generateNonce = (): string => {
  return Date.now().toString() + Math.random().toString(36).substring(2);
};

// Validation utilities
export const isValidEthereumAddress = (address: string): boolean => {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
};

export const isValidTransactionHash = (hash: string): boolean => {
  return /^0x[a-fA-F0-9]{64}$/.test(hash);
};

export const isValidPrivateKey = (key: string): boolean => {
  return /^(0x)?[a-fA-F0-9]{64}$/.test(key);
};

// Time utilities
export const addMinutes = (date: Date, minutes: number): Date => {
  return new Date(date.getTime() + minutes * 60000);
};

export const isExpired = (expirationDate: Date): boolean => {
  return new Date() > expirationDate;
};

export const formatTimestamp = (date: Date): string => {
  return date.toISOString();
};

// BigNumber utilities para valores ETH
export const weiToEth = (wei: string): string => {
  const ethValue = BigInt(wei) / BigInt(10 ** 18);
  return ethValue.toString();
};

export const ethToWei = (eth: string): string => {
  const weiValue = BigInt(Math.floor(parseFloat(eth) * 10 ** 18));
  return weiValue.toString();
};

export const formatEthValue = (wei: string, decimals: number = 4): string => {
  const eth = parseFloat(weiToEth(wei));
  return eth.toFixed(decimals);
};

// Pagination utilities
export const calculateOffset = (page: number, limit: number): number => {
  return (page - 1) * limit;
};

export const calculateTotalPages = (total: number, limit: number): number => {
  return Math.ceil(total / limit);
};

// Sleep utility para desenvolvimento
export const sleep = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

// Array utilities
export const chunk = <T>(array: T[], size: number): T[][] => {
  return Array.from({ length: Math.ceil(array.length / size) }, (_, index) =>
    array.slice(index * size, index * size + size)
  );
};

export const uniqueBy = <T, K>(array: T[], keyFn: (item: T) => K): T[] => {
  const seen = new Set<K>();
  return array.filter(item => {
    const key = keyFn(item);
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
};

// Environment utilities (estas funções são para uso no backend)
export const getRequiredEnv = (key: string): string => {
  // Esta função deve ser usada apenas no ambiente Node.js
  const env = (globalThis as any).process?.env;
  const value = env?.[key];
  if (!value) {
    throw new Error(`Required environment variable ${key} is not set`);
  }
  return value;
};

export const getOptionalEnv = (key: string, defaultValue: string): string => {
  const env = (globalThis as any).process?.env;
  return env?.[key] ?? defaultValue;
};

export const getBooleanEnv = (key: string, defaultValue: boolean = false): boolean => {
  const env = (globalThis as any).process?.env;
  const value = env?.[key];
  if (!value) return defaultValue;
  return value.toLowerCase() === 'true';
};

export const getNumberEnv = (key: string, defaultValue: number): number => {
  const env = (globalThis as any).process?.env;
  const value = env?.[key];
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) {
    throw new Error(`Environment variable ${key} must be a valid number`);
  }
  return parsed;
};

// Retry utility
export const retry = async <T>(
  fn: () => Promise<T>,
  maxAttempts: number = 3,
  delay: number = 1000
): Promise<T> => {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === maxAttempts) {
        throw lastError;
      }
      
      await sleep(delay * attempt);
    }
  }
  
  throw lastError!;
};

// Debounce utility
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void => {
  let timeout: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

// Throttle utility
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void => {
  let inThrottle: boolean;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};
