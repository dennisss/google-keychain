Google Keychain Utilities
=========================

*Disclaimer: This project is not affiliated with Google in any way and allows for raw access that can be used to access your Google account, so use at your own risk*

This is a collection of utilities for reading and reusing the authentication keys that official google installable applications store on your computer and as well as documentation from reversing the applications where appropriate.

Where applicable, this library documents the corresponding functionality in the original application code
- For Python applications, `uncompyle6` can be used to decompile the distributed `.pyo` files. Most references are relative to the `site_packages` folder

Currently supported target applications:
- `Backup and Sync` app (only tested on macOS)
	- This is the new Google Drive desktop client that backs up local files to the cloud
	- Written in Python 2.7 with a WX based UI
	- Uses a standard OAuth2 authentication client which all secrets stored in the OS specific keyring
	- The `client_id` and `client_secret` are hard coded into the `common/auth/oauth_constants.py` file

Prerequisites
-------------

If running from this repository:
- Make sure you have Yarn installed
- Run `yarn install`

If using as a node_module
- Run `yarn add google-keychain` or `npm install google-keychain`
- `import { ... methods ... } from 'google-keychain';`


Usage
-----

NOTE: Running the below code requests accessing the other app's keychains, so you will likely be prompted for your password to gain access

**Example 1:** Fetching credentials from an installed and signed-in instance of `Backup in Sync` and listing all files in the root of your Google Drive:
- Run `./samples/`





Use Cases
---------

- Bypassing the `Advanced Protection Program` warning shown below in the image below
	- Google's APP secures your account by preventing third party OAuth clients from accessing certain scopes on your account such as Google Drive access. But, they do allow their own official applications to access these scopes
	- Because they support some completely client-side apps like the backup one, these priveleged client secrets are available offline and stored on your computer
	- By extracting the oauth secrets, you can spoof an official google application from your own code


This is what happens if APP is enabled and using performing a third-party OAuth sign-in. This policy can be bypassed if running locally by the official google keys

<img src="https://raw.githubusercontent.com/dennisss/google-keychain/master/google-app-policy.png" width="200">

