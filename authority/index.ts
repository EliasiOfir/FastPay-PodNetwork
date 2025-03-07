import dotenv from 'dotenv';

dotenv.config({path: '.env.authority'});

import * as ed from '@noble/ed25519';
import {createHash} from 'crypto';

// patch: Set the hashing function manually
ed.etc.sha512Sync = (msg) => createHash('sha512').update(msg).digest();

import express from 'express';
import helmet from 'helmet';
import cors from 'cors';

// Calculate TOTAL_AUTHORITIES dynamically
const totalAuthorities = Object.keys(process.env).filter((key) => key.startsWith('PRIVATE_KEY_')).length;
process.env.TOTAL_AUTHORITIES = totalAuthorities.toString();

// Get the authority index from command-line arguments
const authorityIndexArg = process.argv.find((arg) => arg.startsWith('--authority_index='));
const authorityIndex = authorityIndexArg ? parseInt(authorityIndexArg.split('=')[1], 10) : 1;

// Map authority index to corresponding environment variables
const portEnvVar = `PORT_${authorityIndex}`;
const privateKeyEnvVar = `PRIVATE_KEY_${authorityIndex}`;
const publicKeyEnvVar = `PUBLIC_KEY_${authorityIndex}`;

// Update environment variables dynamically
process.env.PORT = process.env[portEnvVar] || '3000'; // Default port fallback
process.env.PRIVATE_KEY = process.env[privateKeyEnvVar] || ''; // Fallback to empty string if not set
process.env.PUBLIC_KEY = process.env[publicKeyEnvVar] || ''; // Fallback to empty string if not set

import router from './router';
import errorHandlers from '../shared/errorHandlers';


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