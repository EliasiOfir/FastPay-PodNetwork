export type TransferOrder = {
    amount: number;
    sender: string;
    recipient: string;
    nextSequence: number;
    signature?: string;
};


export type TransferCert = {
    authPubKey: string;
    cert: string;
};


export type User = {
    publicKey: string;
    balance: number;
    nextSequence: number;
    pendingOrder?: TransferOrder;
    confirmedCertificates: TransferCert[][];
};


export type LiteUser = {
    publicKey: string;
    balance: number;
    nextSequence: number;
};
