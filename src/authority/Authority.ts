import * as ed from "@noble/ed25519";
import {TransferCert, TransferOrder} from "../shared/types";
import {keyToString, transferToMessage} from "../shared/signHelper";

export class Authority {
    constructor(private _privateKey: Uint8Array, private _publicKey: Uint8Array) {
    }

    sign(transfer: TransferOrder): TransferCert {
        return {
            authPubKey: keyToString(this._publicKey),
            cert: keyToString(ed.sign(transferToMessage(transfer), this._privateKey))
        }
    }
}