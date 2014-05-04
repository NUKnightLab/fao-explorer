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
	
	// add sticky switcher here 

    var swapLandsatImages = function() {
        var idx = Math.ceil(25 * (mcs.leftPct/100)) - 1;

        // optimization
        if (prevIndex === undefined || prevIndex === idx) {
            prevIndex = idx;
            return;
          }
        $('div#landsat-container img').css('visibility', 'hidden');
        $('div#landsat-container img:eq(' + idx + ')').css('visibility', 'visible');
      }
    var prevIndex = undefined; // used for landsat

    var yr = 1985;

    var capitalStock = {};
    var topCrops = {};

    function humanNumbers(n) {
      if (n > 1000000000000) {
          n = n/1000000000000.0
          return n.toFixed(2) + " trillion";
      }
      if (n > 1000000000) {
          n = n/1000000000.0
          return n.toFixed(2) + " billion";
      }
      if (n > 1000000) {
          n = n/1000000.0
          return n.toFixed(2) + " million";
      }
      return n.toFixed(0);
    }

    var setChartHeight = function() {
        $.each(capitalStock, function(index, value) {
          if (value['year'] == yr) {
            var livestock = parseFloat(value['LIVESTOCK'] * 1000000)
            var crops = parseFloat(value['CROPS'] * 1000000);
            var sum = livestock + crops;
            var livestockHeight = (livestock / sum) * 100;
            var cropsHeight = (crops / sum) * 100;

            $(compareItems[0]).css('height', livestockHeight + '%');
            $(compareItems[1]).css('height', cropsHeight + '%');
            $(values[0]).html('$' + humanNumbers(livestock));
            $(values[1]).html('$' + humanNumbers(crops));
          };
        });
    };

    // -- initialize for comparison chart
    if ($('div#compare-chart')) {
    var compareItems = $('.compare-chart-item-amount');
    var values = $('.value');


    $.getJSON("data/capital-stock/China-capital.json", function(data) {
      capitalStock = data;
      setChartHeight();
    })
    }

    // -- end initialize    




    $("#timeline-navbar").mCustomScrollbar({
    	scrollInertia: 0,
    	horizontalScroll:true,
    	autoDraggerLength: false,
    	advanced:{autoExpandHorizontalScroll:false,updateOnContentResize:false},
    	scrollButtons: { enable: false },
    	contentTouchScroll: true,
    	callbacks:{
			
    		whileScrolling:function(){
				console.log("whileScrolling")
    			var yr = 1985 + Math.floor(25 * (mcs.leftPct/100));
    			$(".mCSB_dragger_bar").html( yr );
				
    		},
			
    		onScroll: function() {
                if ($('div#compare-chart')) {
                  setChartHeight();
                }

                if ($('div#landsat-container')) {
                  swapLandsatImages();
                }

				console.log("HEY")
    			var idx = Math.ceil(25 * (mcs.leftPct/100)) - 1;
   			 	// optimization 
   			 	if (prevIndex === undefined || prevIndex === idx) {
    				revIndex = idx;
    				return;
    			}
				
				$('div#landsat-container img').css('visibility', 'hidden');
			 	$('div#landsat-container img:eq(' + idx + ')').css('visibility', 'visible');
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
	
	viz(china, "#navbar-chart-urban-rural");
	viz(china, "#navbar-chart-population");
	
});


