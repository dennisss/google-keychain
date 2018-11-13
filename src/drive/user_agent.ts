/*
	Assuming you have Google Backup and Sync installed, this get's a user-agent that it uses to make requests

	In the actual app, this logic is in the 'common/user_agent.py' file
*/

const IS_BETA = false; // This is hard coded in the platforms/osx/omaha.py file (we currently don't support parsing it out)

const APICLIENT_VERSION = '1.6.5'; // From 'apiclient/__init__.py' which references 'googleapiclient/__init__.py'

const VERSION = '3.43.1584.4446'; // From 'version.Version.FULL'

const OS_VERSION = 'Darwin/10.14.1'; // TODO: Automate this (see common/os_utils.py)

enum NotificationMethod {
	PUSH = 'push_enabled',
    POLLING = 'polling_enabled'
}

function getBitFlavor() {
	if(process.arch === 'ia32') {
		return '32-bit';
	}

	return '64-bit';
}


/**
 * Gets the User-Agent used by the backup and sync program
 * 
 * There are two main user agents:
 * 1. Regular (for_api=false): Used for the OAuth handshake for exchanging authorization tokens for access tokens, etc.
 * 2. API (for_api=true): Used by the rest of the app to communicate with the Google Drive API
 */
export function GetGoogleDriveUserAgent(for_api?: boolean) {

	var notif_method = ''; // It doesn't seem like this is ever configured by this app at least

	var client_agent = for_api?
		`google-api-python-client/${APICLIENT_VERSION} (gzip)` :
		'gdata-py/null(gzip)';


	return `googledrivesync-${VERSION}${IS_BETA? '-beta' : ''} (${getBitFlavor()}) ${client_agent} (${OS_VERSION}${notif_method})`
}

