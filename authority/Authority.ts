import * as ed from "@noble/ed25519";
import {TransferCert, TransferOrder} from "../shared/types";
import {keyToString, stringToKey, transferToMessage} from "../shared/signHelper";

export class Authority {
    private readonly _privateKey: Uint8Array;
    private readonly _publicKey: Uint8Array;
    private readonly _authoritiesPublicKeys: string[];


    constructor() {
        this._privateKey = stringToKey(process.env.PRIVATE_KEY);
        this._publicKey = stringToKey(process.env.PUBLIC_KEY);

        this._authoritiesPublicKeys = [];

        // Loop through all environment variables
        for (const [key, value] of Object.entries(process.env)) {
            if (key.startsWith("PUBLIC_KEY_")) {
                this._authoritiesPublicKeys.push(value);
            }
        }

        if (this._authoritiesPublicKeys.length === 0) {
            console.warn('No ports were found in the .env.authority file.');
        }
    }

    sign(transfer: TransferOrder): TransferCert {
        return {
            authPubKey: keyToString(this._publicKey),
            cert: keyToString(ed.sign(transferToMessage(transfer), this._privateKey))
        }
    }

    verify(transfer: TransferOrder, transferCerts: TransferCert[]): { verified: boolean, errMessage: string } {
        // validate 2n+1 out of 3n+1
        if (transferCerts && transferCerts.length < 1 + 2 * (this._authoritiesPublicKeys.length - 1) / 3) {
            return {verified: false, errMessage: "Not enough certificates"};
        }

        const message = transferToMessage(transfer);

        for (const cert of transferCerts) {
            if (this._authoritiesPublicKeys.indexOf(cert.authPubKey) === -1)
                return {verified: false, errMessage: "Invalid certificate"};

            if (!ed.verify(stringToKey(cert.cert), message, stringToKey(cert.authPubKey)))
                return {verified: false, errMessage: "Verification Failed"};
        }

        return {verified: true, errMessage: ""};
    }
}