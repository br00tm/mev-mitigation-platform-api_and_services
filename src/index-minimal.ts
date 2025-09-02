import fastify from 'fastify';
import cors from '@fastify/cors';
import { config } from 'dotenv';

// Carregar variáveis de ambiente
config();

const server = fastify({ logger: true });

// Registrar CORS
server.register(cors, {
  origin: true
});

// Rota de health check
server.get('/health', async (request, reply) => {
  return { status: 'OK', timestamp: new Date().toISOString() };
});

// Rota básica da API
server.get('/api/v1/status', async (request, reply) => {
  return {
    service: 'MEV Mitigation Platform API',
    version: '1.0.0',
    status: 'running'
  };
});

// Iniciar servidor
const start = async () => {
  try {
    const port = Number(process.env.API_PORT) || 3001;
    const host = process.env.HOST || '0.0.0.0';
    
    await server.listen({ port, host });
    console.log(`🚀 Servidor rodando em http://${host}:${port}`);
    console.log(`📊 Health check: http://${host}:${port}/health`);
    console.log(`🔧 API Status: http://${host}:${port}/api/v1/status`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();
