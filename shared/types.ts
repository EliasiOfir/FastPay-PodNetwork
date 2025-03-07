
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


export type UserState = {
    publicKey: string; // The public verification key of x
    balance: number; // Balance of the user (balance𝑥(𝛼))
    nextSequence: number; // Tracking the expected sequence number (next_sequence𝑥(𝛼))
    pendingOrder?: TransferOrder; // The last pending transfer order (pending𝑥(𝛼)), if any
    confirmedCertificates: TransferCert[][]; // List of confirmed certificates (confirmed𝑥(𝛼))
};