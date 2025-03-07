import {Authority} from "./Authority";
import {TransferOrder, TransferCert, UserState} from "../shared/types";

import * as ed from "@noble/ed25519";
import {stringToKey, transferToMessage} from "../shared/signHelper";

class UsersCache {
    // Private map to store UserState with publicKey as the key
    private _userStates: Map<string, UserState>;
    private _authority: Authority;

    constructor(authority: Authority) {
        // Initialize the map
        this._userStates = new Map<string, UserState>();
        this._authority = authority;
    }

    initUser(publicKey: string) {
        if (this.hasUser(publicKey))
            throw new Error("User already exists");

        const user: UserState = {
            publicKey,
            balance: 10,
            pendingOrder: null,
            nextSequence: 0,
            confirmedCertificates: []
        };

        this._userStates.set(publicKey, user);
        return {balance: user.balance, nextSequence: user.nextSequence};
    }

    // Retrieve a user from the map
    getUser(publicKey: string): UserState | undefined {
        const user = this._userStates.get(publicKey);
        if (!user)
            throw new Error("User does not exist");
        return user;
    }

    // Check if a user exists in the map
    hasUser(publicKey: string): boolean {
        return this._userStates.has(publicKey);
    }

    // Add a pending transfer to a user's state
    addPendingTransfer(transfer: TransferOrder): TransferCert {
        const user = this._userStates.get(transfer.sender)
        if (!user) throw new Error("Invalid user");

        const recipient = this._userStates.get(transfer.recipient)
        if (!recipient) {
            this.initUser(transfer.recipient)
        }

        if (!ed.verify(stringToKey(transfer.signature), transferToMessage(transfer), stringToKey(user.publicKey))) {
            throw new Error("Invalid signature");
        }

        if (user.balance < transfer.amount)
            throw new Error("Insufficient funds");

        if (user.nextSequence !== transfer.nextSequence)
            throw new Error("Invalid sequence");

        user.pendingOrder = transfer;
        return this._authority.signMessage(transfer);

    }

    confirmOrder(publicKey: string, transferCerts: TransferCert[]): boolean {
        const sender = this.getUser(publicKey);
        const pendingOrder = sender.pendingOrder;
        const recipient = this.getUser(sender.pendingOrder.recipient);

        if (!this._authority.verifyMultiCerts(pendingOrder, transferCerts))
            return false

        sender.balance -= pendingOrder.amount;
        recipient.balance += pendingOrder.amount;
        sender.nextSequence++
        sender.pendingOrder = null;
        sender.confirmedCertificates.push(transferCerts);

        return true;
    }
}

export default UsersCache;