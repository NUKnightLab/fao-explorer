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

// @codekit-prepend "library/waypoints.js";
// @codekit-prepend "library/waypoints-sticky.js";

// @codekit-prepend "library/china.js";
// @codekit-prepend "library/india.js";

// @codekit-prepend "library/d3.js";
// @codekit-prepend "library/d3plus.js";

// @codekit-prepend "library/jquery.mCustomScrollbar.js";

$(document).ready(function(){

	/* WAYPOINTS
	================================================== */
	$('#main-nav').waypoint('sticky', {
		offset: 50,
		wrapper: '<div class="sticky-wrapper" />',
		stuckClass: 'navbar-fixed-top'
	});

	/* TIMELINE NAVBAR
	================================================== */
	$("#timeline-navbar").mCustomScrollbar({
        scrollInertia: 0,
		horizontalScroll:true,
        autoDraggerLength: false,
		advanced:{autoExpandHorizontalScroll:false,updateOnContentResize:false},
        scrollButtons: { enable: false },
        contentTouchScroll: true,
        callbacks:{
            whileScrolling:function(){
                var yr = 1985 + Math.floor(25 * (mcs.leftPct/100));
                $(".mCSB_dragger_bar").html( yr );
            }
        }
	});

    $(".mCSB_dragger_bar").html("1985");
	
	/* TIMELINE NAVBAR CHART
	================================================== */
	function viz(data, container) {
		d3plus.viz()
		.container(container)
		.data(data)
		.type("stacked")
		.id("type")
		.text("type")
		.y("value")
		.x("Year")
		.color("color")
		.draw()
	}
	
	viz(china, "#china");
	
});


