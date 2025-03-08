import {TransferCert, TransferOrder} from "../shared/types";
import axios from "axios";

const API_BASE_URL: string = process.env.API_BASE_URL || 'http://localhost';

export class AuthorityClient {
    private readonly _authoritiesUrl: string[];

    constructor() {
        this._authoritiesUrl = []

        // for simplicity, assuming all authorities are on the URL
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

    async createUser(publicKey: string): Promise<{ nextSequence: number, balance: number }> {
        const endpointURL = `${this._authoritiesUrl[0]}/user`;

        try {
            const response = await axios.post<{ nextSequence: number, balance: number }>(
                endpointURL,
                {publicKey},
                {headers: {'Content-Type': 'application/json'}}
            );

            return response.data;

        } catch (error: any) {
            // Handle any errors during the API call
            console.error('Error during /create API call:', error.message);
            if (error.response) {
                console.error('Response data:', error.response.data);
            }
            throw error;
        }
    }

    async getUser(publicKey: string): Promise<{ nextSequence: number, balance: number }> {
        const endpointURL = `${this._authoritiesUrl[0]}/user/${publicKey}`;

        try {
            // Make the POST request to the /transfer endpoint
            const response = await axios.get<{ nextSequence: number, balance: number }>(
                endpointURL,
                {headers: {'Content-Type': 'application/json'}}
            );

            return response.data;

        } catch (error: any) {
            // Handle any errors during the API call
            console.error('Error during /create API call:', error.message);
            if (error.response) {
                console.error('Error data:', error.response.data);
            }
            throw error;
        }
    }

    async transfer(transferOrder: TransferOrder): Promise<void> {
        const transferCerts = await this.postTransfer(transferOrder);
        console.log('post transfer success');

        // as discussed no need to wait for confirmations
        await this.confirmTransfer(transferCerts, transferOrder.sender)
            .then(() => {
                console.log('Successfully confirmed transfer!');
            })
            .catch((error) => {
                console.error('Error occurred during transfer confirm:', error.message);
            });
    }

    async postTransfer(transferOrder: TransferOrder): Promise<TransferCert[]> {
        const condition = (response: any) => response.status === 200;

        // To store requests and their controllers
        const controllers: AbortController[] = [];
        const transferCerts: TransferCert[] = [];

        let resolver: any;

        // Create a promise that resolves once we gather 5 responses with status 200
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

        console.log(`Collected ${transferCerts.length} responses out of ${this._authoritiesUrl.length} with status 200:`, transferCerts);
        return transferCerts;
    }

    async confirmTransfer(transferCerts: TransferCert[], publicKey: string): Promise<void> {
        const requests = this._authoritiesUrl.map((url) =>
            axios.post(`${url}/confirm`, {transferCerts, publicKey}, {
                headers: {
                    'Content-Type': 'application/json',
                },
            })
        );

        // Wait for all requests to resolve or reject
        await Promise.all(requests);
    }
}