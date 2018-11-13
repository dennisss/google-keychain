
import plist from 'plist';
import fs from 'fs';
import path from 'path';


const CHROME_APP = '/Applications/Google Chrome.app/Contents';

const FIRST_STRING = 'dummytoken';

type ConfigPath = [keyof GoogleChromeClientConfig]|[keyof GoogleChromeClientConfig, keyof OAuthClient];
const VAR_MAP: { [key: string]: ConfigPath } = {
	'GOOGLE_API_KEY': ['api_key'],
	'GOOGLE_DEFAULT_CLIENT_ID': ['default', 'client_id'],
	'GOOGLE_DEFAULT_CLIENT_SECRET': ['default', 'client_secret'],
	'GOOGLE_CLIENT_ID_MAIN': ['main', 'client_id'],
	'GOOGLE_CLIENT_SECRET_MAIN': ['main', 'client_secret'],
	'GOOGLE_CLIENT_ID_CLOUD_PRINT': ['cloud_print', 'client_id'],
	'GOOGLE_CLIENT_SECRET_CLOUD_PRINT': ['cloud_print', 'client_secret'],
	'GOOGLE_CLIENT_ID_REMOTING': ['remoting', 'client_id'],
	'GOOGLE_CLIENT_SECRET_REMOTING': ['remoting', 'client_secret'],
	'GOOGLE_CLIENT_ID_REMOTING_HOST': ['remoting_host', 'client_id'],
	'GOOGLE_CLIENT_SECRET_REMOTING_HOST': ['remoting_host', 'client_secret']
}

interface OAuthClient {
	client_id: string|null;
	client_secret: string|null;
}

export interface GoogleChromeClientConfig {
	version: string; /**< The chrome version */
	api_key: string|null;
	default: OAuthClient;
	main: OAuthClient;
	cloud_print: OAuthClient;
	remoting: OAuthClient;
	remoting_host: OAuthClient;
}

/**
 * Gets the OAuth and API client configuration used by the Google Chrome Application installed
 * 
 * This pretty much tries to find the strings compiled down from this file: https://chromium.googlesource.com/chromium/chromium/+/trunk/google_apis/google_api_keys.cc
 */
export function GetGoogleChromeClientConfig(): GoogleChromeClientConfig {

	let appInfo = plist.parse(fs.readFileSync(path.join(CHROME_APP, 'Info.plist')).toString('utf8'));
	let ver = (appInfo as any)['KSVersion'] as string;

	let bin_path = path.join(CHROME_APP, `Versions/${ver}/Google Chrome Framework.framework/Versions/Current/Google Chrome Framework`);


	let fd = fs.openSync(bin_path, 'r');
	let stat = fs.fstatSync(fd);

	// Find tha location of the strings by looking for the first well known dummy token that should be before them 
	let strings_pos = -1;
	{
		let state = 0;
		let pos = 0;
		let block_size = 512;
		let buf = Buffer.allocUnsafe(block_size);
		while(pos < stat.size) {
			let n = Math.min(block_size, stat.size - pos);

			fs.readSync(fd, buf, 0, n, pos);
			for(var i = 0; i < n; i++) {
				if(buf[i] === FIRST_STRING.charCodeAt(state)) {
					state++;
					if(state === FIRST_STRING.length) {
						strings_pos = pos + i - state + 1;
						break;
					}
				}
				else {
					// TODO: Currently this only works for the matching state machine because the string only has a single 'd' and it is at the start
					state = 0;
				}
			}

			pos += 512;
		}
	}

	if(strings_pos < 0) {
		throw new Error('Failed to find tokens string table');
	}

	// Just allocate a bunch of memory and we will likely read more than we need
	let table = Buffer.allocUnsafe(1024);
	fs.readSync(fd, table, 0, 1024, strings_pos);

	let tableIdx = 0;

	// Gets the next null terminated string
	function readTableString() {
		let start = tableIdx;
		let end = start;
		while(true) {
			if(end >= table.length) {
				return null;
			}

			if(table[end] === 0) {
				break;
			}

			end++;
		}

		tableIdx = end + 1;
		return table.slice(start, end).toString('utf8');
	}

	// Read all of the strings we got
	var strs = [];
	while(true) {
		let str = readTableString();
		if(str === null) {
			break;
		}
		else {
			strs.push(str);
		}
	}



	let cfg: GoogleChromeClientConfig = {
		version: ver,
		api_key: null,
		default: { client_id: null, client_secret: null },
		main: { client_id: null, client_secret: null },
		cloud_print: { client_id: null, client_secret: null },
		remoting: { client_id: null, client_secret: null },
		remoting_host: { client_id: null, client_secret: null }
	};


	// Interprating them
	// Because of the ordering in the source code file, they form key-value pairs, but the key is immediately after the value (or no value is given in the case of a key that points to the dummy token)
	let lastWasKey = true;
	// NOTE: We start from 1 to skip the dummy
	for(var i = 1; i < strs.length; i++) {
		let s = strs[i];
		if(VAR_MAP[s]) {
			if(!lastWasKey) {
				let v = strs[i - 1];
				let p = VAR_MAP[s];
				if(p.length === 1) { cfg[p[0]] = v; }
				if(p.length === 2) { (cfg[p[0]] as any)[p[1]] = v; }
			}
			lastWasKey = true;
		}
		else {
			lastWasKey = false;
		}
	}	

	return cfg; 
}
