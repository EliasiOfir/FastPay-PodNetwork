import express, {Router, Request, Response} from 'express';
import UsersCache from "./UsersCache";
import {Authority} from "./Authority";
import {TransferCert, TransferOrder} from "../shared/types";

const authority = new Authority();
const usersCache = new UsersCache(authority);
const locks = new Map<string, boolean>();

const router: Router = express.Router();

// Express body-parser
router.use(express.json());
router.use(express.urlencoded({extended: true}));

router.get('/user/:publicKey', (req: Request, res: Response) => {
	const publicKey = req.params.publicKey;

	if (!publicKey || publicKey.trim().length === 0) {
		res.status(400).json({error: 'Public key is required.'});
	}

	const {nextSequence, balance} = usersCache.getUser(publicKey)
	res.send({nextSequence, balance});
})

router.post('/user', (req: Request, res: Response) => {
	const publicKey = req.body.publicKey;

	if (!publicKey || publicKey.trim().length === 0) {
		res.status(400).json({error: 'Public key is required.'});
	}

	const {nextSequence, balance} = usersCache.initUser(publicKey)

	res.send({nextSequence, balance});
})

router.post('/transfer', (req: Request, res: Response) => {
	console.log(req.body);
	const transferOrder: TransferOrder = req.body;

	console.log(transferOrder);

	if (!transferOrder.sender || transferOrder.sender.trim().length === 0) {
		res.status(400).json({error: 'Sender is required.'});
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
	} finally {
		locks.delete(transferOrder.sender)
	}

	if (!transferCert) {
		res.status(400).json({error: 'Invalid signature'});
		return;
	}

	res.send(transferCert);
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
