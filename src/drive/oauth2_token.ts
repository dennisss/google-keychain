'use strict';

/*
	The serialization of the secrets is handled by the GoogleDriveOAuth2Token class located in 'common/auth/oauth2_token.py' in the application
*/


export class GoogleDriveOAuth2Token {
	public refresh_token: string;
	public client_id: string;
	public client_secret: string;
	public scopes: string[];

	private static BLOB_PREFIX = '2G';

	public static FromBlob(blob: string) {
		if(!blob.startsWith(this.BLOB_PREFIX)) {
			throw new Error('Invalid blob: missing standard prefix');
		}

		let rest = blob.slice(this.BLOB_PREFIX.length);

		let parts = decodeList(rest);
		if(parts.length !== 4) {
			throw new Error('Invalid blob: appears to be incomplete');
		}

		var tok = new GoogleDriveOAuth2Token();
		tok.refresh_token = parts[0];
		tok.client_id = parts[1];
		tok.client_secret = parts[2];
		tok.scopes = decodeList(parts[3]);

		return tok;
	}

	public ToBlob() {
		return GoogleDriveOAuth2Token.BLOB_PREFIX + encodeList([
			this.refresh_token, this.client_id, this.client_secret, encodeList(this.scopes)
		]);
	}

	/**
	 * This is not an offical behavior but typically each component of the token follows a standard format, so this verifies that the tokens 'look' valid without actually testing them against the google servers 
	 */
	public valid() : boolean {

		var refresh_valid = this.refresh_token.startsWith('1/') && this.refresh_token.length === 45;

		// NOTE: Typically the subdomain will be only composed of numbers for google apps but may be more complex with third party apps
		var id_regex = /^([a-z0-9\-]+)\.apps\.googleusercontent\.com$/i;
		var id_valid = id_regex.exec(this.client_id)? true : false;

		var secret_valid = this.client_secret.length === 24;

		// for these they must all be valid urls and should ideally be in the list of google documented scopes
		var url_regex = /^(((https?):\/\/)|\/)([a-z0-9\._\-&#\?=%]+)(:[0-9]+)?(\/[a-z0-9\._\-&#\?=%]+)*\/?$/i;
		var scopes_valid = true;
		for(let s of this.scopes) {
			if(!url_regex.exec(s)) {
				scopes_valid = false;
				break;
			}
		}

		return refresh_valid && id_valid && secret_valid && scopes_valid;
	}
}

function encodeList(list: string[]) {
	return list.map((s) => Buffer.from(s, 'utf8').toString('base64')).join('|');
}

function decodeList(blob: string) {
	return blob.split('|').map((s) => Buffer.from(s, 'base64').toString('utf8'));
}

