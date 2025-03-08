import express, {Router, Request, Response} from 'express';
import UsersStore from "./UsersStore";
import {Authority} from "./Authority";
import {LiteUser, TransferCert, TransferOrder} from "../shared/types";

const authority = new Authority();
const usersCache = new UsersStore(authority);
const locks = new Map<string, boolean>();

const router: Router = express.Router();

// Express body-parser
router.use(express.json());
router.use(express.urlencoded({extended: true}));


// get user by public key
router.get('/user/:publicKey', (req: Request, res: Response) => {
    const publicKey = req.params.publicKey;

    if (!publicKey || publicKey.trim().length === 0) {
        res.status(400).json({error: 'Public key is required.'});
    }

    res.send(usersCache.getUser(publicKey) as LiteUser);
})

router.post('/user', (req: Request, res: Response) => {
    const publicKey = req.body.publicKey;

    if (!publicKey || publicKey.trim().length === 0) {
        res.status(400).json({error: 'Public key is required.'});
    }

    res.send(usersCache.initUser(publicKey));
})

router.post('/transfer', (req: Request, res: Response) => {
    const transferOrder: TransferOrder = req.body;

    if (!transferOrder.sender || transferOrder.sender.trim().length === 0) {
        res.status(400).json({error: 'Sender is required.'});
        return;
    }

    if (!transferOrder.recipient || transferOrder.recipient.trim().length === 0) {
        res.status(400).json({error: 'Recipient is required.'});
        return;
    }

    if (!transferOrder.signature || transferOrder.signature.trim().length === 0) {
        res.status(400).json({error: 'Signature is required.'});
        return;
    }

    if (transferOrder.amount <= 0) {
        res.status(400).json({error: 'Amount must be positive.'});
        return;
    }

    let transferCert: TransferCert;

    locks.set(transferOrder.sender, true);
    try {

        transferCert = usersCache.addPendingTransfer(transferOrder)
        res.send(transferCert);
    } catch (err: any) {
        res.status(400).json({error: err.message});
    } finally {
        locks.delete(transferOrder.sender)
    }

});

router.post('/confirm', (req: Request, res: Response) => {
    const {publicKey, transferCerts} = req.body;

    if (!publicKey || publicKey.trim().length === 0) {
        res.status(400).json({error: 'Public key is required.'});
        return;
    }

    if (!usersCache.hasUser(publicKey)) {
        res.status(400).json({error: 'User not found'});
        return;
    }

    if (usersCache.getUser(publicKey).pendingOrder === null) {
        res.status(400).json({error: 'No pending order'});
        return;
    }

    locks.set(publicKey, true);
    try {
        usersCache.confirmOrder(publicKey, transferCerts);
    } finally {
        locks.delete(publicKey.sender)
    }

    res.send();
})

export default router;
