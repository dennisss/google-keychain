'use strict';

/*
	Accessing locally stored Google Drive credentials from the keyring
	- Currently this should work at least with how the 'Backup and Sync' application stores them
*/

import keytar from 'keytar';
import { GoogleDriveOAuth2Token } from './oauth2_token';


const SERVICE_NAME = 'Google Drive';


export interface GoogleDriveCredential {
	email: string;
	machine_id: string|null; /**< This is a UUIDv1 in hex format generated on device (not sure what it is used for yet) */
	token: GoogleDriveOAuth2Token|null;
}


export async function GetGoogleDriveCredentials(): Promise<GoogleDriveCredential[]> {

	let rawCreds = await keytar.findCredentials(SERVICE_NAME);

	const account_regex = /^([^\s]+)(?:\s+-\s+([^\s]+))?$/;

	let creds = [];
	let credsIdx : { [email: string]: GoogleDriveCredential } = {};

	for(let rc of rawCreds) {
		let m = account_regex.exec(rc.account);
		if(!m) {
			console.warn('Unknown account name: ' + rc.account);
			continue;
		}

		let email = m[1];
		let type = m[2];

		if(!credsIdx[email]) {
			let c: GoogleDriveCredential = {
				email: email,
				machine_id: null,
				token: null
			};

			creds.push(c);
			credsIdx[email] = c;
		}

		let c = credsIdx[email];

		if(type === undefined) {
			let tok: GoogleDriveOAuth2Token;
			try {
				tok = GoogleDriveOAuth2Token.FromBlob(rc.password)
			}
			catch(err) {
				console.error('Invalid token in ' + rc.account + ': ' + err.message);
				continue;
			}

			if(!tok.valid()) {
				console.warn('Possibly invalid token for: ' + rc.account);
			}

			c.token = tok;
		}
		else if(type === 'machine') {
			c.machine_id = rc.password;
		}
		else {
			console.warn('Unsupported account data for: ' + rc.account);
		}
	}


	return creds;
}
