import {Authority} from "./Authority";
import {TransferOrder, TransferCert, User, LiteUser} from "../shared/types";
import * as ed from "@noble/ed25519";
import {stringToKey, transferToMessage} from "../shared/signHelper";
import {Authorities} from "./Authorities";

class UsersStore {
    private _userStates: Map<string, User>;

    constructor(private _authority: Authority, private _authorities: Authorities,) {
        this._userStates = new Map<string, User>();
    }

    initUser(publicKey: string): LiteUser {
        if (this.hasUser(publicKey))
            throw new Error("User already exists");

        // int new user with balance 10 for simplicity
        const user: User = {
            publicKey,
            balance: 10,
            pendingOrder: undefined,
            nextSequence: 0,
            confirmedCertificates: []
        };

        this._userStates.set(publicKey, user);
        return {publicKey, balance: user.balance, nextSequence: user.nextSequence};
    }

    getUser(publicKey: string): User {
        const user = this._userStates.get(publicKey);
        if (!user)
            throw new Error("User does not exist");
        return user;
    }

    hasUser(publicKey: string): boolean {
        return this._userStates.has(publicKey);
    }

    addPendingTransfer(transfer: TransferOrder): TransferCert {
        const user = this._userStates.get(transfer.sender) ||
            (() => {
                throw new Error("Invalid user")
            })()

        const recipient = this._userStates.get(transfer.recipient);
        if (!recipient) {
            this.initUser(transfer.recipient)
        }

        if (transfer.signature === undefined)
            throw new Error("No signature");

        if (!ed.verify(stringToKey(transfer.signature), transferToMessage(transfer), stringToKey(user.publicKey))) {
            throw new Error("Invalid signature");
        }

        if (user.balance < transfer.amount)
            throw new Error("Insufficient funds");

        if (user.nextSequence !== transfer.nextSequence)
            throw new Error("Invalid sequence");

        user.pendingOrder = transfer;
        return this._authority.sign(transfer);

    }

    confirmOrder(publicKey: string, transferCerts: TransferCert[]): LiteUser {
        const sender = this.getUser(publicKey) ||
            (() => {
                throw new Error("Invalid user")
            })();
        const pendingOrder = sender.pendingOrder ||
            (() => {
                throw new Error("No pending order")
            })();
        const recipient = this.getUser(sender.pendingOrder.recipient);

        const {verified, errMessage} = this._authorities.verify(pendingOrder, transferCerts);

        if (!verified) {
            throw new Error(errMessage);
        }

        sender.balance -= pendingOrder.amount;
        recipient.balance += pendingOrder.amount;
        sender.nextSequence++
        sender.pendingOrder = undefined;
        sender.confirmedCertificates.push(transferCerts);

        return sender;
    }
}

export default UsersStore;