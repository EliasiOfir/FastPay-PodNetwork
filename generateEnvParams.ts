import * as ed from "@noble/ed25519";
import * as fs from "fs";
import * as dotenv from "dotenv";
import {createHash} from "crypto";
import {generateKeyPair} from "./src/shared/signHelper";

// patch: Set the hashing function manually
ed.etc.sha512Sync = (msg) => createHash("sha512").update(msg).digest();

// Load existing .env variables (if needed)
dotenv.config();

// Get NUM_KEYS from command-line arguments or default to 5
const NUM_KEYS = parseInt(process.argv[2] || "5", 10);

if (isNaN(NUM_KEYS) || NUM_KEYS <= 0) {
    console.error("❌ Invalid NUM_KEYS parameter. Please provide a positive integer.");
    process.exit(1);
}

async function generateKeys(): Promise<{ privateKey: string; publicKey: string }[]> {
    const keyPairs = [];

    for (let i = 0; i < NUM_KEYS; i++) {
        const {privateKey, publicKey} = generateKeyPair();

        keyPairs.push({privateKey, publicKey});
    }

    return keyPairs;
}

async function saveToEnvFile() {
    let authorityEnv = "";
    let clientEnv = "";

    const keyPairs = await generateKeys();
    let portStart = 3000;
    keyPairs.forEach((kp, index) => {
        authorityEnv += `PRIVATE_KEY_${index + 1}=${kp.privateKey}\n`;
        authorityEnv += `PUBLIC_KEY_${index + 1}=${kp.publicKey}\n`;
        authorityEnv += `PORT_${index + 1}=${portStart}\n\n`;

        clientEnv += `PORT_${index + 1}=${portStart}\n`;
        portStart++;
    });

    fs.writeFileSync(".env.authority", authorityEnv, {encoding: "utf8"});
    fs.writeFileSync(".env.client", clientEnv, {encoding: "utf8"});
    console.log(`✅ ${NUM_KEYS} key pairs have been saved to .env file.`);
}

saveToEnvFile().catch(console.error);