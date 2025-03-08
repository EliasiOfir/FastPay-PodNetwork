import {TransferOrder} from "./types";
import * as ed from "@noble/ed25519";

export function generateKeyPair(): { privateKey: string; publicKey: string } {
    const privateKey = keyToString(ed.utils.randomPrivateKey());
    const publicKey = keyToString(ed.getPublicKey(privateKey));
    return {privateKey, publicKey};
}

export function transferToMessage(transfer: TransferOrder): Uint8Array {
    return new TextEncoder().encode(`${transfer.sender}-${transfer.recipient}-${transfer.amount}-${transfer.nextSequence}`);
}

export function keyToString(k: Uint8Array): string {
    return Buffer.from(k).toString('hex')
}

export function stringToKey(s: string): Uint8Array {
    return Buffer.from(s, 'hex')
}