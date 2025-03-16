import {TransferCert, TransferOrder} from "../shared/types";
import {stringToKey, transferToMessage} from "../shared/signHelper";
import * as ed from "@noble/ed25519";

export class Authorities {
    constructor(private _authoritiesPublicKeys: string[]) {
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