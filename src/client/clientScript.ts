import inquirer from 'inquirer';
import {AuthorityClient} from './AuthorityClient';
import {generateKeyPair} from "../shared/signHelper";

import dotenv from 'dotenv';

dotenv.config({path: '.env.client'});

import * as ed from '@noble/ed25519';
import {createHash} from 'crypto';

// patch: Set the hashing function manually
ed.etc.sha512Sync = (msg) => createHash('sha512').update(msg).digest();

const {privateKey, publicKey} = generateKeyPair();

const authorityClient = new AuthorityClient(privateKey, publicKey);

// Display the randomly generated keys
console.log('Random keys generated:');
console.log('Private Key:', privateKey);
console.log('Public Key:', publicKey);

enum ActionType {
    Transfer = 'transfer',
    Balance = 'balance',
    InitUser = 'init user',
    Exit = 'exit',
}

async function mainMenu(): Promise<ActionType> {
    const {actionType} = await inquirer.prompt([
        {
            type: 'list',
            name: 'actionType',
            message: 'What would you like to do?',
            choices: Object.values(ActionType)
        }
    ]);

    return actionType;
}

async function transferMenu(): Promise<{ amount: number, recipient: string }> {
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


async function main() {
    while (true) {
        const action: ActionType = await mainMenu();
        try {

            switch (action) {
                case ActionType.Transfer:
                    const {amount, recipient} = await transferMenu()
                    await authorityClient.transfer(recipient, amount);
                    console.log('Transfer successful');
                    break;
                case ActionType.Balance:
                    console.log(`Balance: ${await authorityClient.getBalance()}`);
                    break;
                case ActionType.InitUser:
                    await authorityClient.createUser();
                    console.log('User successfully created');
                    break;
                case ActionType.Exit:
                    console.log('Exiting...');
                    return;
                default:
                    console.log('Invalid action type, try again');
            }
        } catch (err: any) {
            console.error('Error code:', err.code);
            console.error('Error message:', err.message);
            console.error('Error data:', err.response?.data);
            console.log('Try again');
        }
    }
}

main().catch(console.error);