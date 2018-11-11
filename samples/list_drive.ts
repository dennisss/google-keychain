#!/usr/bin/env node ./node_modules/.bin/ts-node

import { google } from 'googleapis';
import { GetGoogleDriveCredentials, GoogleDriveClient } from '../src';

const drive = google.drive('v3');

(async function() {

	let creds = await GetGoogleDriveCredentials();

	// In case of corrupted data, we filter to only those accounts for which we could get tokens for
	creds = creds.filter((c) => {
		return c.token? true : false;
	})

	if(creds.length === 0) {
		console.error('Did not find any Google Drive accounts on this system');
		process.exit(1);
	}

	let cred = creds[0];
	console.log('Found ' + creds.length + ' google account(s)');
	console.log('Using: ' + cred.email);
	console.log('');
	console.log('Allowed scopes:', cred.token.scopes);
	console.log('');

	// This client replaces any typical usage of an OAuth2Client for properly emulating the original app
	let auth = new GoogleDriveClient(cred);

	let res = await drive.files.list({
		pageSize: 5,
		auth: auth
	});

	let files = res.data.files;

	console.log('First 5 Files:', files);


})().catch((err) => {
	console.error(err);
	process.exit(0);
});