var ModalEffect = function() {

	function init() {

		var overlay = document.querySelector( '.modal-overlay' );

		[].slice.call( document.querySelectorAll( '.modal-trigger' ) ).forEach( function( el, i ) {
			var modal = document.querySelector( '#' + el.getAttribute( 'data-modal' ) );

			var	close = modal.querySelectorAll( '.modal-close' );

			function removeModal( hasPerspective ) {
				classie.remove( modal, 'modal-show' );
			}

			el.addEventListener( 'click', function( ev ) {
				classie.add( modal, 'modal-show' );
				overlay.removeEventListener( 'click', removeModal );
				overlay.addEventListener( 'click', removeModal );
			});

			close.forEach(function(node) {
				node.addEventListener( 'click', function( ev ) {
					ev.stopPropagation();
					removeModal();
				});
			});

		} );

	}

	init();

};
