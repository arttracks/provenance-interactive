//= require "_moment"
//= require "_julian"
//= require "_lodash.min"


// ----  D3 DIMENSIONS  -------------------------------------------------------

var margin = {top: 40, right: 20, bottom: 40, left: 20},
    width = $("#map").width() - margin.left - margin.right,
    height = $("#map").height() - margin.top - margin.bottom;

// ----  CONSTANTS  -----------------------------------------------------------

var MAP_HEIGHT        = 680;
var GUTTER            = 20;
var TIMEBOX_HEIGHT    = height - (MAP_HEIGHT+GUTTER);
var LARGE_DOT         = {radius: 8, type: "ownerPin", xOffset: -.8};
var SMALL_DOT         = {radius: 6, type: "eventPin", xOffset: -.5};
var TIME_RANGE_YEARS  = 4;
var TIME_RANGE        = (1000*60*60*24*365)*TIME_RANGE_YEARS // years


// ----  VARIABLES  -----------------------------------------------------------

var svg;            //  Main SVG element
var worldMap;       //  Holder for the map elements
var x;              //  Scale for the x axis
var xAxis;          //  Axis for x
var projection;     //  projection for the map
var mapPath;        //  Actual map geometry
var provenance;     //  The parsed data of provenance
var events;         //  The parsed data for exhibition history
var scale;          //  A fudge factor for map zooming
var selectedDate;   //  The date currently selected in the timeline


// ----  HELPER FUNCTIONS  ----------------------------------------------------

var dateFormat = d3.time.format("%Y-%m-%d");
var getDate = function(d) {return dateFormat.parse(d.replace("?",""))}
var nameKey = function(d) {return d.name;}
var hasLat  = function(d) {return d.lat}
var getGeoPair = function(d){return [d.lng,d.lat]};
var yearOffset = function(date,firstDate,lastDate){
  if (!lastDate){lastDate = firstDate;}

  // if between, 1.
  if (date >= firstDate && date <= lastDate) {return 1;}

  if (date < firstDate) {
    return (1-Math.min(1,(Math.abs(date-firstDate)/TIME_RANGE)));
  }
  else {
    return (1-Math.min(1,(Math.abs(date-lastDate)/TIME_RANGE)));
  }
}


// ----  INITIALIZE ELEMENTS  -------------------------------------------------
queue()
  .defer(d3.json, "/data/world-110m2.json")
  .await(allLoaded);


// #############################################################################
// #        INTERACTION FUNCTIONS                                              #
// #############################################################################

//-----------------------------------------------------------------------------
function handleMouse(d,i) {
  var e = d3.event;
  if (e.buttons != 1){
    return;
  }
  var m = d3.mouse(this);
  selectedDate = x.invert(m[0]);
  redraw();
}

//-----------------------------------------------------------------------------
function handleMouseUp(d,i) {
  selectedDate = null;
  if ($(".singleItem") && provenance){
    redraw();
  }
}

// #############################################################################
// #        DRAWING FUNCTIONS                                                  #
// #############################################################################

//-----------------------------------------------------------------------------
function redraw() {

  svg.selectAll("g.x.axis")
    .call(xAxis)
    .selectAll("text")
      .attr("dy","0.5em")
      .style("opacity", function(d) {
        if (!selectedDate) return 1;
        return .25 + .75*yearOffset(selectedDate,d);
       
      })

  drawOwnerMovementArcs();
  drawExhibitionMovementArcs();
  
  drawExhibitionPins();
  drawOwnerPins();

  drawTimeline();
}


//-----------------------------------------------------------------------------
function drawOwnerPins() {

  var ownerData = provenance.filter(hasLat);
  var ownerPins = worldMap.selectAll("." + LARGE_DOT.type).data(ownerData,nameKey)
    .call(drawPin, scale, LARGE_DOT)
    .classed("pittsburgh", function(d){return d.location_name.includes("Pittsburgh")})
    .classed("creator", function(d,i){return i == 0});
}

//-----------------------------------------------------------------------------
function drawOwnerMovementArcs() {
  var movementPairs = d3.pairs( provenance.filter(hasLat).map(getGeoPair))
  movementPairs = movementPairs.map(function(d,i) {
    return {
      points: d,
      date: provenance[i].beginning,
      lastDate: provenance[i].ending
    };
  })

  var ownerArcs = worldMap.selectAll(".movement_arc").data(movementPairs)
    .call(drawMovementArc,scale,"movement_arc");
}

//-----------------------------------------------------------------------------
function drawExhibitionPins() {
  var eventPins = worldMap.selectAll("." + SMALL_DOT.type).data(events)
    .call(drawPin,scale, SMALL_DOT)
}

//-----------------------------------------------------------------------------
function drawExhibitionMovementArcs() {
  var eventMovements = events.map(function(d) {
    return {
      points: [d.src,[d.lng,d.lat]], 
      date:   d.date,
      lastDate: d.lastDate
    };
  });
  var eventReturns = events.map(function(d) {
    if (d.dest){
      return {
        points: [d.dest,[d.lng,d.lat]],
        date:   d.date
      };   
    }
  }).filter(function(d){return (d != undefined)});
  eventMovements = eventMovements.concat(eventReturns);

  var eventArcs = worldMap.selectAll(".event_movement_arc").data(eventMovements)
    .call(drawMovementArc,scale, "event_movement_arc") 
}

//-----------------------------------------------------------------------------
function drawTimeline() {

  var pastdate, futuredate;

  // Draw selected time highlight
  if (selectedDate) {
    pastdate = new Date();
    futuredate = new Date();
    futuredate.setFullYear(selectedDate.getFullYear()+5, selectedDate.getMonth(), selectedDate.getDay());
    pastdate.setFullYear(selectedDate.getFullYear()-TIME_RANGE_YEARS, selectedDate.getMonth(), selectedDate.getDay());
    
    var selectbox_width =  (x(selectedDate)-x(pastdate))*2

    svg.select('#timeline-selectbox')
      .attr("x", x(pastdate))
      .attr("width", selectbox_width)
      .style("opacity",1)
  }
  else {
    svg.select('#timeline-selectbox')
      .transition()
        .style("opacity",0)
  }



  var timelineBars = svg.select("#timeline-background").selectAll('.timelineBar').data(provenance);
  var definite_rects = svg.select("#timeline-background").selectAll('.definite_rect').data(provenance)
  var timebarHeight = Math.min(TIMEBOX_HEIGHT/provenance.length,30);


  var rectEnter = timelineBars.enter()
    .append("g")
      .attr("class", "timelineBar")
  rectEnter.append("rect")
    .attr("class", "possible_rect");
  rectEnter.append("text")
    .attr("class", "timebar_owner_name");


  timelineBars.exit().remove()

  timelineBars
    .attr("transform", function(d,i){
      var str = "translate(";
      str += (d.beginning ? x(d.beginning) : -1000);
      str += ",";
      str += (height-(timebarHeight*(i+1)));
      str += ")";
      return str;
    })


  timelineBars.select(".timebar_owner_name")
    .text(function(d){return d.name;})
    .attr("dy",timebarHeight*.75)
    .attr("dx", 2);

  timelineBars.select(".possible_rect")
    .attr("width", function(d){
      if (d.beginning && d.ending){
        return Math.max(Math.abs(x(d.ending)-x(d.beginning)),2);
      }
      else {
        return 0;
      }
    })
    .attr("height", timebarHeight)
    .classed("pittsburgh", function(d){return d.location_name && d.location_name.includes("Pittsburgh")})



    // definite_rects.enter()
    //   .append("rect")
    //   .attr("class", "definite_rect")

    // definite_rects.exit().remove()

    // definite_rects
    //   // .select(function(d) { return d.def_begin && d.def_end ? this : null;})
    //   .attr("x", function(d){return x(d.def_begin);})
    //   .attr("width", function(d){return  Math.abs(x(d.def_end)-x(d.def_begin));})
    //   .attr("y", function(d,i){return height-(timebarHeight*(i+1))})
    //   .attr("height", timebarHeight);
}



// #############################################################################
// #        GRAPHICAL ELEMENT FUNCTIONS                                        #
// #############################################################################


//-----------------------------------------------------------------------------
function drawMovementArc(selection, scale, arcClass) {
  var arc = selection.enter()
    .append("g")
    .attr("class", arcClass)
    .append("path")

  selection.exit().remove()

  selection.select("path")
    .attr("stroke-width", 1.5 / scale + "px")
    .attr('d',function(d){
      var p1 = projection(d.points[0])
      var p2 = projection(d.points[1])
      var x1 = p1[0]
      var y1 = p1[1]
      var x2 = p2[0]
      var y2 = p2[1]
      var dist2 = (x2-x1)*(x2-x1) + (y2-y1)*(y2-y1);
      var dist = Math.sqrt(dist2);
      var centerX = (x1+x2)/2;
      var centerY = (y1+y2)/2 - (dist*0.1);
      var str = ["M",x1,y1,"Q",centerX,centerY,x2,y2].join(" ")
      return str
    })
    .style("opacity",function(d){
      if (!selectedDate) return .5;
      return yearOffset(selectedDate,d.date,d.lastDate);    
    }); 
  return selection;
}

//-----------------------------------------------------------------------------
function drawPin(selection, scale, type) {

  var r = type.radius / scale;
  var pinLength = -(r*3)

  var pinClasses = {'pin':true};
  pinClasses[type.type] = true;

  var pin = selection.enter()
    .append("g")
    .classed(pinClasses)
  
  pin.append("line")
  pin.append("circle")

  selection.exit().remove();

  selection.style("opacity",function(d){
      if (!selectedDate) return 1;
      return .1 + .9*yearOffset(selectedDate,d.date, d.lastDate);    
    });

  selection.select("circle")
    .attr("r",r)
    .attr("cx",function(d){return projection([d.lng,d.lat])[0]+type.xOffset})
    .attr("cy",function(d){return projection([d.lng,d.lat])[1]+pinLength})

  // draw pin base
  selection.select("line")
    .attr("x1",function(d){return projection([d.lng,d.lat])[0]})
    .attr("x2",function(d){return projection([d.lng,d.lat])[0]+type.xOffset})
    .attr("y1",function(d){return projection([d.lng,d.lat])[1]})
    .attr("y2",function(d){return projection([d.lng,d.lat])[1]+pinLength})
    .style("stroke-width", 1 / scale + "px")

  return selection
}


//-----------------------------------------------------------------------------
function drawStar(centerX, centerY, arms, outerRadius, innerRadius){
  var results = "";
  var angle = Math.PI / arms;
 
  for (var i = 0; i < 2 * arms; i++) {
      // Use outer or inner radius depending on what iteration we are in.
      var r = (i & 1) == 0 ? outerRadius : innerRadius;
      
      var currX = (+(centerX) + Math.cos(i * angle) * r).toPrecision(4);
      var currY = (+(centerY) + Math.sin(i * angle) * r).toPrecision(4);
 
      // Our first time we simply append the coordinates, subsequet times
      // we append a ", " to distinguish each coordinate pair.
      if (i == 0) {
         results = currX + "," + currY;
      }
      else {
         results += ", " + currX + "," + currY;
      }
   }
   return results;
}

// #############################################################################
// #        INITIALIZATION FUNCTIONS                                           #
// #############################################################################

//-----------------------------------------------------------------------------
function allLoaded(error, topology) {
    initializeD3();
    drawMapMask();
    setupProjection();
    drawMap(topology);
    setupAxis();
}  


//-----------------------------------------------------------------------------

function initializeD3() {
  svg = d3.select("#map").append("svg")
     .attr("id","#d3-visualization")
     .attr("width", width + margin.left + margin.right)
     .attr("height", height + margin.top + margin.bottom)
   .append("g")
     .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
}

//-----------------------------------------------------------------------------
function drawMapMask() {
    var defstr  ='  <radialGradient id="redPinhead" cx="25%" cy="40%" r="70%" fx="30%" fy="30%">'
      defstr +='    <stop offset="0%" style="stop-color:rgb(255,100,100);stop-opacity:1" />'
      defstr +='    <stop offset="99%" style="stop-color:rgb(100,0,0);stop-opacity:1" />'
      defstr +='  </radialGradient>'
      defstr +='  <radialGradient id="greyPinhead" cx="25%" cy="40%" r="70%" fx="30%" fy="30%">'
      defstr +='    <stop offset="0%" style="stop-color:rgb(200,200,200);stop-opacity:1" />'
      defstr +='    <stop offset="99%" style="stop-color:rgb(60,60,60);stop-opacity:1" />'
      defstr +='  </radialGradient>'
      defstr +='  <radialGradient id="cmoaPinhead" cx="25%" cy="40%" r="70%" fx="30%" fy="30%">'
      defstr +='    <stop offset="0%" style="stop-color:rgb(255,255,60);stop-opacity:1" />'
      defstr +='    <stop offset="99%" style="stop-color:rgb(185,135,11);stop-opacity:1" />'
      defstr +='  </radialGradient>'
      defstr +='  <radialGradient id="creatorPinhead" cx="25%" cy="40%" r="70%" fx="30%" fy="30%">'
      defstr +='    <stop offset="0%" style="stop-color:rgb(60,255,60);stop-opacity:1" />'
      defstr +='    <stop offset="99%" style="stop-color:rgb(20,135,11);stop-opacity:1" />'
      defstr +='  </radialGradient>'
      defstr +='  <linearGradient id="timelineSelectGradient" x1="0" x2="1" y1="0" y2="0">'
      defstr +='    <stop offset="0%" style="stop-color:#333;stop-opacity:0" />'
      defstr +='    <stop offset="33%" style="stop-color:#fff;stop-opacity:.15" />'
      defstr +='    <stop offset="66%" style="stop-color:#fff;stop-opacity:.15" />'
      defstr +='    <stop offset="100%" style="stop-color:#333;stop-opacity:0" />'
      defstr +='  </radialGradient>'
  var defs = d3.select('svg').append('defs').html(defstr)

  defs.append("mask")
    .attr("id","MapMask")
      .append("rect")
      .attr("x", 0)
      .attr("y", 0)
      .attr("width", width)
      .attr("height",MAP_HEIGHT)
}


//-----------------------------------------------------------------------------
function setupProjection() {
  projection = d3.geo.fahey()
      .scale(300)
      .translate([width*.45, height*.4]);

  mapPath = d3.geo.path()
      .projection(projection);  
}


//-----------------------------------------------------------------------------
function setupAxis() {

  // create the x scale
  x = d3.time.scale.utc()
    .range([0, width]);

  // create the x axis
  xAxis = d3.svg.axis()
    .scale(x)
    .ticks(9)
    .orient("bottom");

  svg.append("g")
      .attr("class", "x axis")
      .attr("transform", "translate(0," + height + ")")
      .append("rect")
        .attr("class","blocker")
        .attr("x",0)
        .attr("y",0)
        .attr("width",width)
        .attr("height", "20")
}

//-----------------------------------------------------------------------------
function drawMap(topology) {
  worldMap = svg.append("g")
   .attr("style", "mask: url(#MapMask)")
     .append("g")
       .attr("class", "map")
  
  worldMap.append("path")
     .datum(topojson.feature(topology, topology.objects.countries))
     .attr("d", mapPath);

  worldMap.append("svg:polygon")
       .attr("id", "pghStar")


  var bg = svg.append("svg")
    .attr("id", "timeline-background")
    .attr("width",width)
    .on("mousemove",handleMouse)
    .on("mousedown",handleMouse)
  bg.append("rect")
    .attr("x",0)
    .attr("y",MAP_HEIGHT+GUTTER)
    .attr("width",width)
    .attr("height",TIMEBOX_HEIGHT)
  bg.append("rect")
    .attr("id", "timeline-selectbox")
    .attr("height",TIMEBOX_HEIGHT)
    .attr("x",0)
    .attr("y",MAP_HEIGHT+GUTTER)

  d3.select("body").on("mouseup", handleMouseUp)
}



// #############################################################################
// #        DATA FUNCTIONS                                                     #
// #############################################################################

//-----------------------------------------------------------------------------
function loadWorkOntoMap(n) {
  var data       = getWork(n);  // External call
  var creation   = getDate(data.creation_date);
  
  provenance = buildProvenanceObject(data, creation);
  events     = buildEvents(data);
  scale      = zoomMap(provenance,events);

  x.domain([creation,moment()]);
  redraw();
}

//-----------------------------------------------------------------------------
function buildProvenanceObject(data, creation) {
  return data.owners.map(function(el){
    var obj =  {
      ending: getDate(el.latest_possible),
      name: el.name
    };

    if (el.location) {
      obj.location_name = el.location.name;
      obj.lat = el.location.lat;
      obj.lng = el.location.lng;
    }

    if (el.earliest_definite) { obj.def_begin = getDate(el.earliest_definite); }
    if (el.latest_definite)   { obj.def_end   = getDate(el.latest_definite);   }

    if(el.earliest_possible) {
      obj.beginning = moment.max(moment(getDate(el.earliest_possible)),moment(creation));
    }
    else {
      obj.beginning = creation;
    }

    obj.date = obj.beginning;
    obj.lastDate = obj.ending;

    obj.debug = el;
    return obj;
  });
}


//-----------------------------------------------------------------------------
function buildEvents(data) {
  var obj = [];
  var src, dest;

  var home;

  data.events.forEach(function(el){
    if (el.venues && el.venues[0].earliest) {
      var date_of_show = getDate(el.venues[0].earliest)
      var home = {lng: -79.99589, lat: 40.44062};
      for (var q1 = 0; q1 < data["owners"].length; q1++) {
        var currentOwner = data["owners"][q1];
        if (!currentOwner.location || !currentOwner.earliest_definite || !currentOwner.latest_definite) continue;
        var owner_got_it_on = getDate(currentOwner.earliest_definite);
        var owner_lost_it_on = getDate(currentOwner.latest_definite);
        if (owner_got_it_on < date_of_show && owner_lost_it_on > date_of_show) {
          home = currentOwner.location;
          break;
        } 
      }

      var dest = [home.lng,home.lat];
      var src = dest;

      for (var q1 = 0; q1 < el.venues.length; q1++) {
        var venue = el.venues[q1]
        if (venue.location && venue.earliest && venue.latest) {
          var lat = +venue.location.lat;
          var lng = +venue.location.lng;
          var loc = {
            src: src,
            lat: lat,
            lng: lng,
            date: getDate(venue.earliest),
            lastDate: getDate(venue.latest)
          }
          src = [lng,lat];
          if (q1 == el.venues.length-1) {
            loc.dest = dest;
          }
          obj.push(loc);
        }
      };
    }
  });
  return obj;
}

//-----------------------------------------------------------------------------
function zoomMap(provenance, events) {
  var xmin,xmax,ymin,ymax;
  var all_events = provenance.concat(events);
  xmin = all_events.reduce(function(p, c, i, a) {return c.lng ? Math.min(p,c.lng) : p;},100000);
  xmax = all_events.reduce(function(p, c, i, a) {return c.lng ? Math.max(p,c.lng) : p;},-100000);
  ymin = all_events.reduce(function(p, c, i, a) {return c.lng ? Math.min(p,c.lat) : p;},100000);
  ymax = all_events.reduce(function(p, c, i, a) {return c.lng ? Math.max(p,c.lat) : p;},-100000);

  var bounds= [projection([xmin,ymin]),projection([xmax,ymax])];

  var dx = bounds[1][0] - bounds[0][0],
      dy = bounds[1][1] - bounds[0][1],
      x = (bounds[0][0] + bounds[1][0]) / 2,
      y = (bounds[0][1] + bounds[1][1]) / 2,
      scale = .9 / Math.max(dx / width, dy / MAP_HEIGHT),
      translate = [width / 2 - scale * x, MAP_HEIGHT / 2 - scale * y];

  worldMap
    .style("stroke-width", 1.5 / scale + "px")
    .attr("transform", "translate(" + translate + ")scale(" + scale + ")");

  var pgh = projection([-79.99589,40.44062]);  
  d3.select("#pghStar").attr("points", drawStar(pgh[0],pgh[1], 5, 10/scale, 5/scale))

  return scale;
}