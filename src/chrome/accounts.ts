'use strict';

import path from 'path'
import keytar from 'keytar';
import sqlite from 'sqlite';
import sqlite3 from 'sqlite3';
import tmp from 'tmp';
import { spawnSync } from 'child_process';
import fs from 'fs';
import crypto from 'crypto';

const SERVICE_NAME = 'Chrome Safe Storage';
const ACCOUNT_NAME = 'Chrome';

const SERVICE_REGEX = /^AccountId-([0-9]+)$/

// See https://chromium.googlesource.com/chromium/src/+/HEAD/docs/user_data_dir.md for a discussion on where all of these folders are typically located
// TODO: Currently we only implement this for macOS
let USER_DATA_DIR = path.join(process.env.HOME!, '/Library/Application Support/Google/Chrome');
let PROFILE_DIR = path.join(USER_DATA_DIR, 'Default');


export interface AccountInfoEntry {
	account_id: string;
	email: string;
	full_name: string;
	gaia: string;
	given_name: string;
	hd: string;
	is_child_account: boolean;
	is_under_advanced_protection: boolean;
	locale: string;
	picture_url: string;
}

interface TokenServiceTableRow {
	service: string;
	encrypted_token: Buffer;
}

let kEncryptionVersionPrefix = 'v10';


export interface GoogleChromeAccount {
	info: AccountInfoEntry;
	refresh_token: string;

	
}


async function GetGoogleChromeAccounts() {

	let db_path = path.join(PROFILE_DIR, 'Web Data');

	let t = tmp.dirSync();
	console.log('Temporarily Dir: ' + t.name + '\n(If this program crashes, you should remove this folder)');

	// NOTE: Because having chrome open locks the database, we copy it for convenience
	// TODO: This isn't very robust to failure if chrome is editing the DB while we are copying it
	let db_copy_path = path.join(t.name, 'db');
	spawnSync('cp', [db_path, db_copy_path]);


	let rows: TokenServiceTableRow[];

	let db;
	try {
		db = await sqlite.open(db_copy_path, { mode: sqlite3.OPEN_READONLY });
		rows = await db.all('SELECT service, encrypted_token FROM token_service');
	}
	catch(err) {
		console.error('Failed to read database tokens:', err);
		return;
	}
	finally {
		if(db) {
			try {
				await db.close();
			}
			catch(e) {
				console.error('Failed while closing db:', e);
			}
		}

		fs.unlinkSync(db_copy_path);
		t.removeCallback();
	}


	// NOTE: Although this key looks like it should be base64 decoded, it should be used as is
	let master_key = await keytar.getPassword(SERVICE_NAME, ACCOUNT_NAME);
	if(!master_key) {
		throw new Error('Failed to get keychain key');
	}
	
	// ^ The above is the master key from which an AES key is derived here: https://github.com/chromium/chromium/blob/b32d055643eee955bd89c5b572810e19740727ec/components/os_crypt/os_crypt_mac.mm#L123
	let encryption_key = crypto.pbkdf2Sync(master_key, 'saltysalt', 1003, 16, 'sha1');


	// 16 is number of bytes in the 128bit AES key
	let iv = ''; for(var i = 0; i < 16; i++) { iv += ' '; }


	let preferences_path = path.join(PROFILE_DIR, 'Preferences');
	let preferences = JSON.parse(fs.readFileSync(preferences_path).toString('utf8'));

	let accounts = preferences.account_info as AccountInfoEntry[];
	let accountIds: { [id: string]: boolean } = {};
	accounts.map((a) => { accountIds[a.account_id] = true; });

	let refreshTokens: { [id: string]: string; } = {};

	for(let r of rows) {

		let m = SERVICE_REGEX.exec(r.service);
		if(!m) {
			console.warn('Unknown account key: ' + r.service);
			continue;
		}

		let aid = m[1];
		if(!accountIds[aid]) {
			console.warn('Unknown account with id: ' + aid);
			continue;
		}

		if(r.encrypted_token.slice(0, kEncryptionVersionPrefix.length).toString() !== kEncryptionVersionPrefix) {
			console.warn('Unknown encryption version');
			continue;
		}


		let token: string;

		// NOTE: AES may crash if the key or data is bad
		try {
			let decipher = crypto.createDecipheriv('aes-128-cbc', encryption_key, iv);

			var enc = r.encrypted_token.slice(kEncryptionVersionPrefix.length);

			let dec = decipher.update(enc);
			dec = Buffer.concat([dec, decipher.final()]);

			token = dec.toString();
		}
		catch(err) {
			console.warn('Decryption failed:', err);
			continue;
		}

		// TODO: Validate that it 'looks-like' a good token
		
		refreshTokens[aid] = token;
	}


	// Putting it all together
	return accounts.map((a) => {
		return {
			info: a,
			refresh_token: refreshTokens[a.account_id] || null
		};
	});
}
