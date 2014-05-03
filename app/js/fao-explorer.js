/**
	Bootstrap Project Template
	Designed and built by Zach Wise at VéritéCo
*/  

/*	Required Files
	CodeKit Import
	http://incident57.com/codekit/
================================================== */

// @codekit-prepend "library/jquery.smooth-scroll.js";

// @codekit-prepend "library/bootstrap/transition.js";
// @codekit-prepend "library/bootstrap/scrollspy.js";
// @codekit-prepend "library/bootstrap/tab.js";
// @codekit-prepend "library/bootstrap/tooltip.js";
// @codekit-prepend "library/bootstrap/carousel.js";
// @codekit-prepend "library/bootstrap/collapse.js";
// @codekit-prepend "library/bootstrap/modal.js";
// @codekit-prepend "library/bootstrap/dropdown.js";
// @codekit-prepend "library/bootstrap/affix.js";

// @codekit-prepend "library/waypoints.js";
// @codekit-prepend "library/waypoints-sticky.js";


$(document).ready(function(){
	
	/* WAYPOINTS
	================================================== */
	$('#main-nav').waypoint('sticky', {
		offset: 50,
		wrapper: '<div class="sticky-wrapper" />',
		stuckClass: 'navbar-fixed-top'
	});
	
	
});