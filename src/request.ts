import { App } from './app';
import { Request as ExpressRequest } from 'express';

export interface Request extends ExpressRequest {
    echoApp?: App;
    rawBody?: string;
}
