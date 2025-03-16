import dotenv from 'dotenv';

dotenv.config({path: '.env.authority'});

import {createHash} from 'crypto';
// patch: Set the hashing function manually
import * as ed from '@noble/ed25519';

// patch
ed.etc.sha512Sync = (msg) => createHash('sha512').update(msg).digest();

import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import {throwIfEmpty} from '../shared/common'

// Calculate TOTAL_AUTHORITIES dynamically
const totalAuthorities = Object.keys(process.env).filter((key) => key.startsWith('PRIVATE_KEY_')).length;
process.env.TOTAL_AUTHORITIES = totalAuthorities.toString();

// Map authority index to corresponding environment variables
const authorityIndex = throwIfEmpty(process.argv[2], 'authority index not provided');

process.env.PORT = throwIfEmpty(process.env[`PORT_${authorityIndex}`], 'port not provided');
process.env.PRIVATE_KEY = throwIfEmpty(process.env[`PRIVATE_KEY_${authorityIndex}`], 'private key not provided');
process.env.PUBLIC_KEY = throwIfEmpty(process.env[`PUBLIC_KEY_${authorityIndex}`], 'public key not provided');


import errorHandlers from './errorHandlers';
import router from "./router";

const app = express();

// Secure app with HTTP headers
app.use(helmet({crossOriginResourcePolicy: {policy: 'cross-origin'}}));

// Allow CORS
app.use(cors());

// Add paths (router)
app.use(router);

// Handle errors
app.use(errorHandlers);

const PORT = process.env.PORT;

app.listen(PORT, () => {
    console.log(
        '\n=============================\n' +
        `Authority ${authorityIndex} listening on port ${PORT}` +
        '\n=============================\n' +
        `Private Key: ${process.env.PRIVATE_KEY || 'Not Set'}` +
        '\nPublic Key: ' + (process.env.PUBLIC_KEY || 'Not Set') +
        '\nTotal Authorities: ' + process.env.TOTAL_AUTHORITIES +
        '\n=============================\n'
    );
});