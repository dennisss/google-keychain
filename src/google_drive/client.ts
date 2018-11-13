
import { DefaultTransporter } from 'google-auth-library';
import { OAuth2Client } from 'google-auth-library/build/src/auth/oauth2client';
import { GoogleDriveCredential } from './index';
import { GetGoogleDriveUserAgent } from './user_agent';
import { AxiosRequestConfig } from 'axios';

/**
 * NOTE: These are the only values permitted to be used with the Google Drive client ids
 */
export enum GoogleDriveRedirectUris {
	OOB = 'urn:ietf:wg:oauth:2.0:oob',
	OOBAuto = 'urn:ietf:wg:oauth:2.0:oob:auto'
}

/**
 * Use to access a Google API given fully authenticated credentials
 * 
 * NOTE: This can be used to authenticate to access any scope authorized api, it is just named a GoogleDriveClient because it will spoof the User-Agent of the Google Backup and Sync app (formerly known as the Google Drive app)
 */
export class GoogleDriveClient extends OAuth2Client {

	public constructor(cred: GoogleDriveCredential, redirect_url: GoogleDriveRedirectUris = GoogleDriveRedirectUris.OOBAuto) {
		let tok = cred.token;

		if(!tok) {
			throw new Error('Must provide a credential with a token available');
		}

		super(tok.client_id, tok.client_secret, redirect_url);

		this.transporter = new SpoofedDefaultTransporter();

		// Acting super paranoid by freezing the transporter so it isn't overriden anywhere
		Object.defineProperty(this, 'transporter', { value: this.transporter, writable: false });

		this.setCredentials({
			refresh_token: tok.refresh_token
		});
	}

}

export class SpoofedDefaultTransporter extends DefaultTransporter {

	_apiUA = GetGoogleDriveUserAgent(true);
	_oauthUA = GetGoogleDriveUserAgent(false);

	configure(opts: AxiosRequestConfig = {}): AxiosRequestConfig {
		opts = super.configure(opts);

		// Because all of the requests go through the same transport, we distinguish between OAuth token operations and API operations based on whether or not the Authorization header is being used
		var isApiReq = opts.headers['Authorization']? true : false;
		opts.headers['User-Agent'] = isApiReq? this._apiUA : this._oauthUA;

		return opts;
	}
}
