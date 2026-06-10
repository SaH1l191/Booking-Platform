import { Registry, Counter, Histogram, collectDefaultMetrics } from 'prom-client';

export const register = new Registry(); 