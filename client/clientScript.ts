import inquirer from 'inquirer';
import {AuthorityClient} from './AuthorityClient';
import {TransferOrder} from '../shared/types';
import {generateKeyPair, keyToString, stringToKey, transferToMessage} from "../shared/signHelper";

import dotenv from 'dotenv';

dotenv.config({path: '.env.client'});

import * as ed from '@noble/ed25519';
import {createHash} from 'crypto';

// Set the hashing function manually
ed.etc.sha512Sync = (msg) => createHash('sha512').update(msg).digest();

const authorityClient = new AuthorityClient();

const {privateKey, publicKey} = generateKeyPair();

// Display the randomly generated keys
console.log('Random keys generated:');
console.log('Private Key:', privateKey);
console.log('Public Key:', publicKey);

console.log(`User successfully created with public key: ${publicKey}`);

async function mainMenu(): Promise<'transfer' | 'balance' | 'init user'> {
    const {actionType} = await inquirer.prompt([
        {
            type: 'list',
            name: 'actionType',
            message: 'What would you like to do?',
            choices: ['transfer', 'balance', 'init user']
        }
    ]);

    return actionType;
}

async function getTransferParams(): Promise<{ amount: number, recipient: string }> {
    const answers = await inquirer.prompt([
        {
            type: 'input',
            name: 'amount',
            message: 'Enter the transfer amount:',
            validate: (input) =>
                !isNaN(parseFloat(input)) && parseFloat(input) > 0
                    ? true
                    : 'Please enter a valid positive transfer amount.',
        },
        {
            type: 'input',
            name: 'recipient',
            message: 'Enter the recipient public key or `g` for generating new one:',
            validate: (input) => (input.length > 0 ? true : 'Recipient public key cannot be empty.'),
        },
    ]);

    if (answers.recipient === 'g') {
        answers.recipient = generateKeyPair().publicKey;
        console.log(`generated recipient: ${answers.recipient}`)
    }

    return {amount: parseFloat(answers.amount), recipient: answers.recipient};
}


async function transfer() {
    try {
        const {amount, recipient} = await getTransferParams()

        const {nextSequence} = await authorityClient.getUser(publicKey)

        const transferOrder: TransferOrder = {
            sender: publicKey, // Sender public key
            recipient,
            amount,
            nextSequence
        };

        transferOrder.signature = keyToString(ed.sign(transferToMessage(transferOrder), stringToKey(privateKey)));

        await authorityClient.transfer(transferOrder);

        console.log('Transfer completed successfully!');
    } catch (error: any) {
        console.error('Error occurred during execution:', error.message);
    }
}

async function balance() {
    console.log(`your balance is: ${(await authorityClient.getUser(publicKey)).balance}`)
}

// Main script logic
async function main() {
    while (true) {
        const action = await mainMenu();

        switch (action) {
            case "transfer":
                await transfer();
                break;
            case "balance":
                await balance();
                break;
            case "init user":
                await authorityClient.createUser(publicKey);
                console.log(`User successfully created with public key: ${publicKey}`);
                break;
            default:
                console.log('Invalid action type, try again');
        }
    }
}

// Execute the main function
main().catch(console.error);