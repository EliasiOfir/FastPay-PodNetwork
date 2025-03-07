import * as ed from "@noble/ed25519";
import {TransferCert, TransferOrder} from "../shared/types";
import {keyToString, stringToKey, transferToMessage} from "../shared/signHelper";

export class Authority {
    private readonly _privateKey: Uint8Array;
    private readonly _publicKey: Uint8Array;
    private readonly _publicKeys: string[];


    constructor() {
        this._privateKey = stringToKey(process.env.PRIVATE_KEY);
        this._publicKey = stringToKey(process.env.PUBLIC_KEY);

        this._publicKeys = [];

        // Loop through all environment variables
        for (const [key, value] of Object.entries(process.env)) {
            // Check if the key is a PUBLIC_KEY
            if (key.startsWith("PUBLIC_KEY_")) {
                this._publicKeys.push(value);
            }
        }

        if (this._publicKeys.length === 0) {
            console.warn('No ports were found in the .env.authority file.');
        }
    }

    signMessage(transfer: TransferOrder): TransferCert {
        return {
            authPubKey: keyToString(this._publicKey),
            cert: keyToString(ed.sign(transferToMessage(transfer), this._privateKey))
        }
    }

    verifyMultiCerts(transfer: TransferOrder, transferCerts: TransferCert[]): boolean {
        console.log(transferCerts);

        // validate 2n+1 out of 3n+1
        if (transferCerts && transferCerts.length < 1 + 2 * (this._publicKeys.length - 1) / 3) {
            throw new Error("Not enough certificates");
        }


        const message = transferToMessage(transfer);

        for (const cert of transferCerts) {
            if (this._publicKeys.indexOf(cert.authPubKey) === -1) {
                throw new Error("Invalid public key");
            }
            if (!ed.verify(stringToKey(cert.cert), message, stringToKey(cert.authPubKey))) return false;
        }

        return true;
    }
}