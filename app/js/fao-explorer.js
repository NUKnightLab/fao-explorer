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
// codekit-prepend "library/d3plus.js";

// @codekit-prepend "library/jquery.mCustomScrollbar.js";


/* DAMN GLOBAL VARIABLES
================================================== */
var prevIndex = undefined,
	yr = 1985,
	capitalStock = {},
	topCrops = {},
	compareItems,
	values,
	is_playing = false,
	dragger,
	dragger_position; 

var swapLandsatImages = function() {
    var idx = Math.ceil(25 * (mcs.leftPct/100)) - 1;

    // optimization
    if (prevIndex === undefined || prevIndex === idx) {
        prevIndex = idx;
        return;
      }
    $('div#landsat-container img').css('visibility', 'hidden');
    $('div#landsat-container img:eq(' + idx + ')').css('visibility', 'visible');
	
    $('div#landsat-container-two img').css('visibility', 'hidden');
    $('div#landsat-container-two img:eq(' + idx + ')').css('visibility', 'visible');
  }

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
	if (yr < 2008) {
	    var value = capitalStock[yr];
	    var livestockHeight = (value['LIVESTOCK'] / capitalStock.max) * 100;
	    var cropsHeight = (value['CROPS'] / capitalStock.max) * 100;

	    $(compareItems[0]).css('height', livestockHeight + '%');
	    $(compareItems[1]).css('height', cropsHeight + '%');
	    $(values[0]).html('$' + humanNumbers(value['LIVESTOCK']));
	    $(values[1]).html('$' + humanNumbers(value['CROPS']));
	}
    


};

var initFAO = function() {
    	/* WAYPOINTS
    	================================================== */
    	$('#main-nav').waypoint('sticky', {
    		offset: 50,
    		wrapper: '<div class="sticky-wrapper" />',
    		stuckClass: 'navbar-fixed-top'
    	});

	
   
	window.setScrollbarYear = function(year) {
        // 
        var mCSB_container = $("#timeline-navbar .mCSB_container");
        var mCustomScrollBox = $("#timeline-navbar .mCustomScrollBox");
        var width = Math.abs(mCSB_container.outerWidth() - mCustomScrollBox.width());
        var pos = (Math.floor(width/25) * (year - 1985)) + ((year - 1985) * 2);
        $("#timeline-navbar").mCustomScrollbar("scrollTo", pos); // navbar-chart-urban-rural
    }
	
    setInterval(function() {
        if (is_playing) {
            if (yr >= 2010) {
                yr = 1984;
            }
            setScrollbarYear(yr + 1);
        }
    }, 100);

	/* SCROLLBAR
	================================================== */
    $("#timeline-navbar").mCustomScrollbar({
    	scrollInertia: 0,
		mouseWheel:false,
    	horizontalScroll:true,
    	autoDraggerLength: false,
    	advanced:{autoExpandHorizontalScroll:false,updateOnContentResize:false},
    	scrollButtons: { enable: false },
    	contentTouchScroll: true,
    	callbacks:{
			
			
    		onScroll: function() {
    			var idx = Math.ceil(25 * (mcs.leftPct/100)) - 1;

    			yr = 1985 + Math.floor(25 * (mcs.leftPct/100));
    			$(".mCSB_dragger_bar").html( yr );
				
                if ($('div#compare-chart')) {
                  setChartHeight();
                }

                if ($('div#landsat-container')) {
                  swapLandsatImages();
                }

				
				$('div#landsat-container img').css('visibility', 'hidden');
			 	$('div#landsat-container img:eq(' + idx + ')').css('visibility', 'visible');
				
				
				dragger_position = dragger.position();
				var drag_width = dragger.width();
				$("#timeline-navbar-line").css("left", dragger_position.left + (drag_width / (100/mcs.leftPct) ) - 10);
				
				
				
				
				if (dragger_position.left >= ($("body").width() - dragger.width() - 2) ) {
					console.log("END")
				}
				
				
			}
			
		}
	});
	
	 $(".mCSB_dragger_bar").html("1985");
	
	/* RESIZE LANDSAT
	================================================== */
	function resizeLandsat() {

		$("#landsat-container").height(ratioHeight($("#landsat-container img").width(), 1459, 719)) ;
	}
	
	/* ON RESIZE
	================================================== */
	$( window ).resize(function() {
		resizeLandsat();
	});
	
	/* INIT STUFF
	================================================== */
	resizeLandsat();
	$("#play-button").click(function(){
		playPause();
	});
	
	// DRAGGER POSITION
	dragger = $(".mCSB_dragger");
	dragger_position = dragger.position();
	//$("#timeline-navbar-line").css("left", dragger_position.left + (dragger.width()/2));
	$("#timeline-navbar-line").css("left", dragger_position.left + (dragger.width()/2));
	
}









/* COMPARISON CHAR TINIT
================================================== */
var compareChartInit = function(the_data_url) {
    if ($('.compare-chart')) {
	    compareItems = $('.compare-chart-item-amount');
	    values = $('.value');


	    $.getJSON(the_data_url, function(data) {
            var max = 0;
            for (var i = 0; i < data.length; i++) {
                capitalStock[data[i].year] = data[i];
                data[i].CROPS = parseFloat(data[i].CROPS * 1000000)
                data[i].LIVESTOCK = parseFloat(data[i].LIVESTOCK * 1000000)
                if (data[i].CROPS > max) { max = data[i].CROPS; }
                if (data[i].LIVESTOCK > max) { max = data[i].LIVESTOCK; }
            }
            capitalStock.max = max;
            setChartHeight();
	    })
    }
}

var playPause = function() {
	
	if (is_playing) {
		pauseTime();
		is_playing = false;
	} else {
		playTime();
		is_playing = true;
	}
}
var playTime = function() {
	console.log("play");
	$("#play-button").html("<span class='glyphicon glyphicon-pause'></span>");
}

var pauseTime = function() {
	console.log("pause");
	$("#play-button").html("Play");
	$("#play-button").html("<span class='glyphicon glyphicon-play'></span>");
}

var humanNumbers = function(n) {
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

/* Utlities
================================================== */

// RATIO
var ratioHeight = function(width, ratio_width, ratio_height) {
	return Math.round((width / ratio_width) * ratio_height);
}

// plug in highcharts
    years = ['1985', '1990', '1995', '2000', '2005', '2010']
    china = [{
            name: 'Rural',
            data: [819033,857756,853896,820755,757952,690789],
            animation: false
        }, {
            name: 'Urban',
            data: [243266,307673,383635,459674,560225,669032],
            animation: false
        }]
    function drawchart(time, country, container) {
    $(container).highcharts({
        chart: {
            type: 'area',
            animation: false,
            margin: [0, -80, 0, -80]
        },
        colors: ['#00A383', '#4671D5', '#00A383', '#FF7640', '#f7a35c', '#8085e9', '#f15c80', '#e4d354', '#8085e8', '#8d4653', '#91e8e1'
        ],
        title: {
            text: ''
        },
        xAxis: {
            categories: years,
            tickmarkPlacement: 'off',
            title: {
                enabled: false
            }
        },
        yAxis: {
            title: {
                text: 'Population (Billion)'
            },
            labels: {
                formatter: function() {
                    return this.value / 1000000;
                }
            }
        },
        tooltip: {
            enabled: false,
            animation: false
        },
        plotOptions: {
            area: {
                stacking: 'normal',
                lineColor: '#666666',
                lineWidth: 1,
                marker: {
                    lineWidth: 0,
                    lineColor: '#666666',
                    symbol: 'circle',
                    radius: 2,
                    states: {
                        hover: {
                            enabled: false
                        }
                    }
                }
            }
        },
        series: country,
        legend: {
            align: "center",
            layout: "vertical", 
            itemMarginTop: 40,
            itemStyle: {color: "#fff", fontWeight: "light", fontSize: "14px", fontFamily: "Helvetica"},
            symbolHeight: 0,
            symbolWidth: 0,
            maxHeight: 500

        }
    });
};

$(document).ready(function(){
    drawchart(years, china, '#navbar-chart-population');

    txt = $("text")
    len = txt.length
    txt[len - 1].remove()
})
