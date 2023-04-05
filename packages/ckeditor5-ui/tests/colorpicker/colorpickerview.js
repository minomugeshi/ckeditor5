/**
 * @license Copyright (c) 2003-2023, CKSource Holding sp. z o.o. All rights reserved.
 * For licensing, see LICENSE.md or https://ckeditor.com/legal/ckeditor-oss-license
 */

/* globals CustomEvent, document */

import ColorPickerView from './../../src/colorpicker/colorpickerview';
import 'vanilla-colorful/hex-color-picker.js';

import testUtils from '@ckeditor/ckeditor5-core/tests/_utils/utils';
import { Locale } from '@ckeditor/ckeditor5-utils';

describe( 'ColorPickerView', () => {
	let locale, view, clock;

	beforeEach( () => {
		locale = new Locale();
		view = new ColorPickerView( locale );
		clock = sinon.useFakeTimers();
		view.render();
	} );

	afterEach( () => {
		view.destroy();
		clock.restore();
	} );

	testUtils.createSinonSandbox();

	describe( 'constructor()', () => {
		it( 'creates element from template', () => {
			expect( [ ...view.element.classList ] ).to.include( 'ck-color-picker', 'ck' );
		} );

		it( 'should create input', () => {
			const input = view.element.children[ 1 ];
			expect( [ ...input.classList ] ).to.include( 'color-picker-hex-input' );
		} );
	} );

	describe( 'render()', () => {
		it( 'should render color picker component', () => {
			expect( view.picker.tagName ).to.equal( document.createElement( 'hex-color-picker' ).tagName );
		} );

		it( 'should update color state in input after changes in color picker', () => {
			const event = new CustomEvent( 'color-changed', {
				detail: {
					value: '#ff0000'
				}
			} );

			view.picker.dispatchEvent( event );

			clock.tick( 200 );

			expect( view.input.fieldView.value ).to.equal( '#ff0000' );
		} );
	} );

	it( 'should update color property after changes in input', () => {
		view.input.fieldView.value = '#ff0000';
		view.input.fieldView.fire( 'input' );

		clock.tick( 200 );

		expect( view.color ).to.equal( '#ff0000' );
	} );

	describe( 'color property', () => {
		it( 'should be initialized with a proper value', () => {
			expect( view.color ).to.be.equal( '' );
		} );

		it( 'should be observable', () => {
			const observableSpy = testUtils.sinon.spy();

			view.on( 'change:color', observableSpy );

			view.color = '#ff0000';

			sinon.assert.calledOnce( observableSpy );
		} );
	} );

	describe( '_hexColor property', () => {
		describe( 'follows the color property and', () => {
			it( 'reflects a hex value', () => {
				view.color = '#ff0000';

				expect( view._hexColor ).to.equal( '#ff0000' );
			} );

			it( 'properly converts rgb format', () => {
				view.color = 'rgb(0, 255, 0)';

				expect( view._hexColor ).to.equal( '#00ff00' );
			} );

			it( 'properly converts hsl format', () => {
				view.color = 'hsl(42, 100%, 52%)';

				expect( view._hexColor ).to.equal( '#ffb60a' );
			} );

			it( 'unfolds a shortened hex format', () => {
				view.color = '#00f';

				expect( view._hexColor ).to.equal( '#0000ff' );
			} );

			it( 'forces hex value in a lowercased format', () => {
				view.color = '#0000FF';

				expect( view._hexColor ).to.equal( '#0000ff' );
			} );

			it( 'handles an empty value', () => {
				view.color = '#fff';
				view.color = '';

				expect( view._hexColor ).to.equal( '#000000' );
			} );

			it( 'gracefully handles an invalid value', () => {
				view.color = '#fff';
				view.color = 'lorem ipsum dolor';

				expect( view._hexColor ).to.equal( '#000000' );
			} );

			it( 'doesnt trigger multiple changes if changed to a same color in different format', () => {
				view._hexColor = '#00ff00';

				const observableSpy = sinon.spy();

				view.on( 'change:_hexColor', observableSpy );

				view.color = '#00ff00';

				expect( observableSpy.callCount, 'first attempt' ).to.equal( 0 );

				view.color = '#00FF00';

				expect( observableSpy.callCount, 'second attempt' ).to.equal( 0 );

				view.color = 'rgb(0, 255, 0)';

				expect( observableSpy.callCount, 'third attempt' ).to.equal( 0 );
			} );
		} );

		describe( 'propagation to the color property', () => {
			it( 'propagates a simple hex value change', () => {
				view._hexColor = '#f1e2a3';

				expect( view.color ).to.equal( '#f1e2a3' );
			} );

			describe( 'output format integration', () => {
				it( 'respects rgb output format', () => {} );
			} );
		} );
	} );
} );