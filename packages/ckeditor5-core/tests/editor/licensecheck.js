/**
 * @license Copyright (c) 2003-2024, CKSource Holding sp. z o.o. All rights reserved.
 * For licensing, see LICENSE.md or https://ckeditor.com/legal/ckeditor-oss-license
 */

/* globals window, console, Response, globalThis, btoa */

import { releaseDate, crc32 } from '@ckeditor/ckeditor5-utils';
import Editor from '../../src/editor/editor.js';
import testUtils from '../../tests/_utils/utils.js';

class TestEditor extends Editor {
	static create( config ) {
		return new Promise( resolve => {
			const editor = new this( config );

			resolve(
				editor.initPlugins()
					.then( () => {
						editor.fire( 'ready' );
					} )
					.then( () => editor )
			);
		} );
	}
}

describe( 'License check', () => {
	afterEach( () => {
		delete TestEditor.builtinPlugins;
		delete TestEditor.defaultConfig;

		sinon.restore();
	} );

	describe( 'license key verification', () => {
		let showErrorStub;

		beforeEach( () => {
			showErrorStub = testUtils.sinon.stub( TestEditor.prototype, '_showLicenseError' );
		} );

		describe( 'required fields in the license key', () => {
			it( 'should not block the editor when required fields are provided and are valid', () => {
				const { licenseKey } = generateKey();

				const editor = new TestEditor( { licenseKey } );

				sinon.assert.notCalled( showErrorStub );
				expect( editor.isReadOnly ).to.be.false;
			} );

			it( 'should block the editor when the `exp` field is missing', () => {
				const { licenseKey } = generateKey( { expExist: false } );

				const editor = new TestEditor( { licenseKey } );

				sinon.assert.calledWithMatch( showErrorStub, 'invalid' );
				expect( editor.isReadOnly ).to.be.true;
			} );

			it( 'should block the editor when the `jti` field is missing', () => {
				const { licenseKey } = generateKey( { jtiExist: false } );

				const editor = new TestEditor( { licenseKey } );

				sinon.assert.calledWithMatch( showErrorStub, 'invalid' );
				expect( editor.isReadOnly ).to.be.true;
			} );

			it( 'should block the editor when the `vc` field is missing', () => {
				const { licenseKey } = generateKey( { vcExist: false } );

				const editor = new TestEditor( { licenseKey } );

				sinon.assert.calledWithMatch( showErrorStub, 'invalid' );
				expect( editor.isReadOnly ).to.be.true;
			} );
		} );

		describe( 'domain check', () => {
			it( 'should pass when localhost is in the licensedHosts list', () => {
				const { licenseKey } = generateKey( { licensedHosts: [ 'localhost' ] } );

				const editor = new TestEditor( { licenseKey } );

				sinon.assert.notCalled( showErrorStub );
				expect( editor.isReadOnly ).to.be.false;
			} );

			it( 'should not pass when domain is not in the licensedHosts list', () => {
				const { licenseKey } = generateKey( { licensedHosts: [ 'facebook.com' ] } );

				const editor = new TestEditor( { licenseKey } );

				sinon.assert.calledWithMatch( showErrorStub, 'domainLimit' );
				expect( editor.isReadOnly ).to.be.true;
			} );

			it( 'should not pass if domain have no subdomain', () => {
				const { licenseKey } = generateKey( { licensedHosts: [ '*.localhost' ] } );

				const editor = new TestEditor( { licenseKey } );

				sinon.assert.calledWithMatch( showErrorStub, 'domainLimit' );
				expect( editor.isReadOnly ).to.be.true;
			} );
		} );

		describe( 'trial check', () => {
			let consoleInfoSpy;

			beforeEach( () => {
				sinon.useFakeTimers( { now: Date.now() } );
				consoleInfoSpy = sinon.spy( console, 'info' );
			} );

			afterEach( () => {
				sinon.restore();
			} );

			it( 'should not block if trial is not expired', () => {
				const { licenseKey, todayTimestamp } = generateKey( {
					licenseType: 'trial',
					isExpired: false,
					daysAfterExpiration: -1
				} );

				const today = todayTimestamp;
				const dateNow = sinon.stub( Date, 'now' ).returns( today );

				const editor = new TestEditor( { licenseKey } );

				sinon.assert.notCalled( showErrorStub );
				expect( editor.isReadOnly ).to.be.false;

				dateNow.restore();
			} );

			it( 'should block if trial is expired', () => {
				const { licenseKey, todayTimestamp } = generateKey( {
					licenseType: 'trial',
					isExpired: false,
					daysAfterExpiration: 1
				} );

				const dateNow = sinon.stub( Date, 'now' ).returns( todayTimestamp );

				const editor = new TestEditor( { licenseKey } );

				sinon.assert.calledWithMatch( showErrorStub, 'trialLimit' );
				expect( editor.isReadOnly ).to.be.true;
				sinon.assert.calledOnce( consoleInfoSpy );
				sinon.assert.calledWith( consoleInfoSpy, 'You are using the trial version of CKEditor 5 plugin with ' +
				'limited usage. Make sure you will not use it in the production environment.' );

				dateNow.restore();
			} );

			it( 'should block editor after 10 minutes if trial license.', () => {
				const { licenseKey, todayTimestamp } = generateKey( {
					licenseType: 'trial',
					isExpired: false,
					daysAfterExpiration: -1
				} );

				const dateNow = sinon.stub( Date, 'now' ).returns( todayTimestamp );

				const editor = new TestEditor( { licenseKey } );

				sinon.assert.notCalled( showErrorStub );
				expect( editor.isReadOnly ).to.be.false;

				sinon.clock.tick( 600100 );

				sinon.assert.calledWithMatch( showErrorStub, 'trialLimit' );
				expect( editor.isReadOnly ).to.be.true;
				sinon.assert.calledOnce( consoleInfoSpy );
				sinon.assert.calledWith( consoleInfoSpy, 'You are using the trial version of CKEditor 5 plugin with ' +
				'limited usage. Make sure you will not use it in the production environment.' );

				dateNow.restore();
			} );

			it( 'should clear timer on editor destroy', done => {
				const { licenseKey, todayTimestamp } = generateKey( {
					licenseType: 'trial',
					isExpired: false,
					daysAfterExpiration: -1
				} );

				const dateNow = sinon.stub( Date, 'now' ).returns( todayTimestamp );
				const editor = new TestEditor( { licenseKey } );
				const clearTimeoutSpy = sinon.spy( globalThis, 'clearTimeout' );

				editor.fire( 'ready' );
				editor.on( 'destroy', () => {
					sinon.assert.calledOnce( clearTimeoutSpy );
					done();
				} );

				editor.destroy();
				dateNow.restore();
			} );
		} );

		describe( 'development license', () => {
			let consoleInfoSpy;

			beforeEach( () => {
				sinon.useFakeTimers( { now: Date.now() } );
				consoleInfoSpy = sinon.spy( console, 'info' );
			} );

			afterEach( () => {
				sinon.restore();
			} );

			it( 'should log information to the console about using the development license', () => {
				const licenseKey = 'foo.eyJleHAiOjE3MTUyMTI4MDAsImp0aSI6IjczNDk5YTQyLWJjNzktNDdlNy1hNmR' +
                    'lLWIyMGJhMmEzYmI4OSIsImxpY2Vuc2VUeXBlIjoiZGV2ZWxvcG1lbnQiLCJ2YyI6Ijg5NzRiYTJlIn0.bar';

				const editor = new TestEditor( { licenseKey } );

				expect( editor.isReadOnly ).to.be.false;
				sinon.assert.calledOnce( consoleInfoSpy );
				sinon.assert.calledWith( consoleInfoSpy, 'You are using the development version of CKEditor 5 with ' +
				'limited usage. Make sure you will not use it in the production environment.' );
			} );

			it( 'should not block the editor if 10 minutes have not passed (development license)', () => {
				const licenseKey = 'foo.eyJleHAiOjE3MTUyMTI4MDAsImp0aSI6IjczNDk5YTQyLWJjNzktNDdlNy1hNmR' +
                    'lLWIyMGJhMmEzYmI4OSIsImxpY2Vuc2VUeXBlIjoiZGV2ZWxvcG1lbnQiLCJ2YyI6Ijg5NzRiYTJlIn0.bar';

				const today = 1715166436000; // 08.05.2024
				const dateNow = sinon.stub( Date, 'now' ).returns( today );

				const editor = new TestEditor( { licenseKey } );

				sinon.assert.notCalled( showErrorStub );
				expect( editor.isReadOnly ).to.be.false;

				sinon.clock.tick( 1 );

				sinon.assert.notCalled( showErrorStub );
				expect( editor.isReadOnly ).to.be.false;

				dateNow.restore();
			} );

			it( 'should block editor after 10 minutes (development license)', () => {
				const licenseKey = 'foo.eyJleHAiOjE3MTUyMTI4MDAsImp0aSI6IjczNDk5YTQyLWJjNzktNDdlNy1hNmR' +
                    'lLWIyMGJhMmEzYmI4OSIsImxpY2Vuc2VUeXBlIjoiZGV2ZWxvcG1lbnQiLCJ2YyI6Ijg5NzRiYTJlIn0.bar';

				/**
                     * after decoding licenseKey:
                     *
                     * licensePaylod: {
                     *  ...,
                     *  exp: timestamp( 09.05.2024 )
                     *  licenseType: 'development'
                     * }
                     */

				const today = 1715166436000; // 08.05.2024
				const dateNow = sinon.stub( Date, 'now' ).returns( today );

				const editor = new TestEditor( { licenseKey } );

				sinon.assert.notCalled( showErrorStub );
				expect( editor.isReadOnly ).to.be.false;

				sinon.clock.tick( 600100 );

				sinon.assert.calledWithMatch( showErrorStub, 'developmentLimit' );
				expect( editor.isReadOnly ).to.be.true;

				dateNow.restore();
			} );

			it( 'should clear timer on editor destroy', done => {
				const licenseKey = 'foo.eyJleHAiOjE3MTUyMTI4MDAsImp0aSI6IjczNDk5YTQyLWJjNzktNDdlNy1hNmR' +
                    'lLWIyMGJhMmEzYmI4OSIsImxpY2Vuc2VUeXBlIjoiZGV2ZWxvcG1lbnQiLCJ2YyI6Ijg5NzRiYTJlIn0.bar';

				/**
                     * after decoding licenseKey:
                     *
                     * licensePaylod: {
                     *  ...,
                     *  exp: timestamp( 09.05.2024 )
                     *  licenseType: 'development'
                     * }
                     */

				const today = 1715166436000; // 08.05.2024
				const dateNow = sinon.stub( Date, 'now' ).returns( today );
				const editor = new TestEditor( { licenseKey } );
				const clearTimeoutSpy = sinon.spy( globalThis, 'clearTimeout' );

				editor.fire( 'ready' );
				editor.on( 'destroy', () => {
					sinon.assert.calledOnce( clearTimeoutSpy );
					done();
				} );

				editor.destroy();
				dateNow.restore();
			} );
		} );

		it( 'should block the editor when the license key is not valid (expiration date in the past)', () => {
			const { licenseKey } = generateKey( {
				isExpired: true
			} );

			const editor = new TestEditor( { licenseKey } );

			sinon.assert.calledWithMatch( showErrorStub, 'expired' );
			expect( editor.isReadOnly ).to.be.true;
		} );

		it( 'should block the editor when the license key has wrong format (wrong verificationCode)', () => {
			const { licenseKey } = generateKey( {
				customVc: 'wrong vc'
			} );

			const editor = new TestEditor( { licenseKey } );

			sinon.assert.calledWithMatch( showErrorStub, 'invalid' );
			expect( editor.isReadOnly ).to.be.true;
		} );

		it( 'should block the editor when the license key has wrong format (missing header part)', () => {
			const { licenseKey } = generateKey( {
				isExpired: true,
				skipHeader: true
			} );

			const editor = new TestEditor( { licenseKey } );

			sinon.assert.calledWithMatch( showErrorStub, 'invalid' );
			expect( editor.isReadOnly ).to.be.true;
		} );

		it( 'should block the editor when the license key has wrong format (missing tail part)', () => {
			const { licenseKey } = generateKey( {
				isExpired: true,
				skipTail: true
			} );

			const editor = new TestEditor( { licenseKey } );

			sinon.assert.calledWithMatch( showErrorStub, 'invalid' );
			expect( editor.isReadOnly ).to.be.true;
		} );

		it( 'should block the editor when the license key has wrong format (payload does not start with `ey`)', () => {
			const licenseKey = 'foo.JleHAiOjIyMDg5ODg4MDAsImp0aSI6ImZvbyIsInZlcmlmaWNhdGlvbkNvZGUiOiJjNTU2YWQ3NCJ9.bar';

			const editor = new TestEditor( { licenseKey } );

			sinon.assert.calledWithMatch( showErrorStub, 'invalid' );
			expect( editor.isReadOnly ).to.be.true;
		} );

		it( 'should block the editor when the license key has wrong format (payload not parsable as a JSON object)', () => {
			const licenseKey = 'foo.eyZm9v.bar';

			const editor = new TestEditor( { licenseKey } );

			sinon.assert.calledWithMatch( showErrorStub, 'invalid' );
			expect( editor.isReadOnly ).to.be.true;
		} );
	} );

	describe( 'usage endpoint', () => {
		it( 'should send request with telemetry data if license key contains a usage endpoint', () => {
			const fetchStub = sinon.stub( window, 'fetch' );

			const { licenseKey } = generateKey( {
				usageEndpoint: 'https://ckeditor.com'
			} );
			const editor = new TestEditor( { licenseKey } );

			editor.fire( 'ready' );

			sinon.assert.calledOnce( fetchStub );

			const sentData = JSON.parse( fetchStub.firstCall.lastArg.body );

			expect( sentData.license ).to.equal( licenseKey );
			expect( sentData.telemetry ).to.deep.equal( { editorVersion: globalThis.CKEDITOR_VERSION } );
		} );

		it( 'should not send any request if license key does not contain a usage endpoint', () => {
			const fetchStub = sinon.stub( window, 'fetch' );

			const { licenseKey } = generateKey();
			const editor = new TestEditor( { licenseKey } );

			editor.fire( 'ready' );

			sinon.assert.notCalled( fetchStub );
		} );

		it( 'should display error on the console and not block the editor if response status is not ok (HTTP 500)', async () => {
			const fetchStub = sinon.stub( window, 'fetch' ).resolves( new Response( null, { status: 500 } ) );
			const originalRejectionHandler = window.onunhandledrejection;
			let capturedError = null;

			window.onunhandledrejection = evt => {
				capturedError = evt.reason.message;
				return true;
			};

			const { licenseKey } = generateKey( {
				usageEndpoint: 'https://ckeditor.com'
			} );
			const editor = new TestEditor( { licenseKey } );

			editor.fire( 'ready' );
			await wait( 1 );
			window.onunhandledrejection = originalRejectionHandler;

			sinon.assert.calledOnce( fetchStub );
			expect( capturedError ).to.equal( 'HTTP Response: 500' );
			expect( editor.isReadOnly ).to.be.false;
		} );

		it( 'should display warning and block the editor when usage status is not ok', async () => {
			const fetchStub = sinon.stub( window, 'fetch' ).resolves( {
				ok: true,
				json: () => Promise.resolve( {
					status: 'foo'
				} )
			} );
			const showErrorStub = testUtils.sinon.stub( TestEditor.prototype, '_showLicenseError' );

			const { licenseKey } = generateKey( {
				usageEndpoint: 'https://ckeditor.com'
			} );
			const editor = new TestEditor( { licenseKey } );

			editor.fire( 'ready' );
			await wait( 1 );

			sinon.assert.calledOnce( fetchStub );
			sinon.assert.calledOnce( showErrorStub );
			sinon.assert.calledWithMatch( showErrorStub, 'usageLimit' );
			expect( editor.isReadOnly ).to.be.true;
		} );

		it( 'should display additional warning when usage status is not ok and message is provided', async () => {
			const fetchStub = sinon.stub( window, 'fetch' ).resolves( {
				ok: true,
				json: () => Promise.resolve( {
					status: 'foo',
					message: 'bar'
				} )
			} );
			const warnStub = testUtils.sinon.stub( console, 'warn' );
			const showErrorStub = testUtils.sinon.stub( TestEditor.prototype, '_showLicenseError' );

			const { licenseKey } = generateKey( {
				usageEndpoint: 'https://ckeditor.com'
			} );
			const editor = new TestEditor( { licenseKey } );

			editor.fire( 'ready' );
			await wait( 1 );

			sinon.assert.calledOnce( fetchStub );
			sinon.assert.calledOnce( warnStub );
			sinon.assert.calledOnce( showErrorStub );
			sinon.assert.calledWithMatch( warnStub, 'bar' );
			sinon.assert.calledWithMatch( showErrorStub, 'usageLimit' );
			expect( editor.isReadOnly ).to.be.true;
		} );
	} );
} );

function wait( time ) {
	return new Promise( res => {
		window.setTimeout( res, time );
	} );
}

function generateKey( {
	isExpired = false,
	jtiExist = true,
	expExist = true,
	vcExist = true,
	customVc = undefined,
	skipHeader,
	skipTail,
	daysAfterExpiration = 0,
	licensedHosts,
	licenseType,
	usageEndpoint
} = {} ) {
	const jti = 'foo';
	const releaseTimestamp = Date.parse( releaseDate );
	const day = 86400000; // one day in milliseconds.

	/**
     * Depending on isExpired parameter we createing timestamp ten days
     * before or after release day.
    */
	const expirationTimestamp = isExpired ? releaseTimestamp - 10 * day : releaseTimestamp + 10 * day;
	const todayTimestamp = ( expirationTimestamp + daysAfterExpiration * day );
	const vc = crc32( getCrcInputData( {
		jti,
		exp: expirationTimestamp / 1000,
		licensedHosts,
		licenseType,
		usageEndpoint
	} ) );

	const payload = encodePayload( {
		jti: jtiExist && jti,
		vc: ( customVc && customVc ) || ( vcExist ? vc : undefined ),
		exp: expExist && expirationTimestamp / 1000,
		licensedHosts,
		licenseType,
		usageEndpoint
	} );

	return {
		licenseKey: `${ skipHeader ? '' : 'foo.' }${ payload }${ skipTail ? '' : '.bar' }`,
		todayTimestamp
	};
}

function encodePayload( claims ) {
	return encodeBase64Safe( JSON.stringify( claims ) );
}

function encodeBase64Safe( text ) {
	return btoa( text ).replace( /\+/g, '-' ).replace( /\//g, '_' ).replace( /=+$/, '' );
}

function getCrcInputData( licensePayload ) {
	const keysToCheck = Object.getOwnPropertyNames( licensePayload ).sort();

	const filteredValues = keysToCheck
		.filter( key => key != 'vc' && licensePayload[ key ] != null )
		.map( key => licensePayload[ key ] );

	return [ ...filteredValues ];
}