import {TransferCert, TransferOrder} from "../shared/types";
import axios from "axios";
import {keyToString, stringToKey, transferToMessage} from "../shared/signHelper";
import * as ed from "@noble/ed25519";

const API_BASE_URL: string = process.env.API_BASE_URL || 'http://localhost';

export class AuthorityClient {
    private readonly _authoritiesUrl: string[];

    constructor(private readonly _privateKey: string, private readonly _publicKey: string) {
        this._authoritiesUrl = []

        // for simplicity, assuming all authorities are on the same URL
        // loading ports for authorities
        for (const [key, value] of Object.entries(process.env)) {
            if (key.startsWith("PORT_")) {
                this._authoritiesUrl.push(`${API_BASE_URL}:${value}`);
            }
        }

        if (this._authoritiesUrl.length === 0) {
            throw new Error('No ports were found in the .env.client file.');
        }
    }

    async createUser() {
        const requests = this._authoritiesUrl.map((url) =>
            axios.post<{ nextSequence: number, balance: number }>(`${url}/user`, {publicKey: this._publicKey}, {
                headers: {
                    'Content-Type': 'application/json',
                },
            })
        );

        // Wait for all requests to resolve or reject
        await Promise.all(requests);

        console.log(`User successfully created with public key: ${this._publicKey}`);
    }

    async getUser(): Promise<{ nextSequence: number, balance: number }> {
        const endpointURL = `${this._authoritiesUrl[0]}/user/${this._publicKey}`;

        // Make the POST request to the /transfer endpoint
        const response = await axios.get<{ nextSequence: number, balance: number }>(
            endpointURL,
            {headers: {'Content-Type': 'application/json'}}
        );

        return response.data;

    }

    async getBalance(): Promise<number> {
        return (await this.getUser()).balance;
    }

    async transfer(recipient: string, amount: number): Promise<void> {
        const {nextSequence} = await this.getUser()

        const transferOrder: TransferOrder = {
            sender: this._publicKey, // Sender public key
            recipient,
            amount,
            nextSequence
        };

        transferOrder.signature = keyToString(ed.sign(transferToMessage(transferOrder), stringToKey(this._privateKey)));

        const transferCerts = await this.postTransfer(transferOrder);
        console.log(`Collected ${transferCerts.length} responses out of ${this._authoritiesUrl.length} with status 200`);

        // as discussed no need to wait for confirmations
        this.confirmTransfer(transferCerts)
            .then(() => {
                console.log('Successfully confirmed transfer!');
            })
            .catch((error) => {
                console.error('Error occurred during transfer confirm:', error.message);
            });
    }

    async postTransfer(transferOrder: TransferOrder): Promise<TransferCert[]> {
        // 200 response defined as success
        const condition = (response: any) => response.status === 200;

        // To store requests and their controllers
        const controllers: AbortController[] = [];
        const transferCerts: TransferCert[] = [];

        let resolver: any;

        const trackerPromise = new Promise<void>((resolve) => {
            resolver = resolve;
        });

        // Send all requests in parallel with AbortController
        this._authoritiesUrl.forEach((url) => {
            const controller = new AbortController(); // Create an AbortController for this request
            controllers.push(controller);

            // Fire the POST request with AbortController
            const config = {
                    headers: {'Content-Type': 'application/json'},
                    signal: controller.signal
                }
            ;
            axios.post<TransferCert>(`${url}/transfer`, transferOrder, config)
                .then((response) => {
                    // Check if the response status is 200
                    if (condition(response)) {
                        transferCerts.push(response.data);

                        // If we've gathered 2n+1 out of 3n+1 matching responses, resolve the tracker promise
                        if (transferCerts.length >= 1 + 2 * (this._authoritiesUrl.length - 1) / 3) {
                            resolver(); // Resolve the tracker promise
                        }
                    }
                })
                .catch((err) => {
                    if (axios.isCancel(err)) {
                        console.log(`Request to ${url} was aborted.`);
                    } else {
                        console.error(`Error fetching ${url}:`, err.message || err);
                    }
                });
        });

        await trackerPromise;

        // Abort remaining requests
        controllers.forEach((controller) => controller.abort());

        return transferCerts;
    }

    async confirmTransfer(transferCerts: TransferCert[]): Promise<void> {
        const requests = this._authoritiesUrl.map((url) =>
            axios.post(`${url}/confirm`, {transferCerts, publicKey: this._publicKey}, {
                headers: {
                    'Content-Type': 'application/json',
                },
            })
        );

        // Wait for all requests to resolve or reject
        await Promise.all(requests);
    }
}