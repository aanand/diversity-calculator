window.calculator = initCalculator({
  chart: document.querySelector(".chart")
});

ko.applyBindings(calculator);

function initCalculator(self) {
  var groupName = self.groupName = ko.observable("women");
  var numSpeakers = self.numSpeakers = ko.observable("20");
  var populationPercentage = self.populationPercentage = ko.observable("10");
  var notes = self.notes = ko.observable();
  var chart = self.chart;

  var chartWidth = chart.offsetWidth;

  setupEvents();
  recalculate();

  return self;

  function setupEvents() {
    numSpeakers.subscribe(recalculate);
    populationPercentage.subscribe(recalculate);
    window.addEventListener("resize", resize, false);
  }

  function recalculate() {
    //if (!numSpeakers.validity.valid || !populationPercentage.validity.valid)
      //return;

    var populationFraction = window.parseInt(populationPercentage())/100;

    self.expectedNumber = window.parseInt(numSpeakers()) * populationFraction;
    self.data = poisson(window.parseInt(numSpeakers()), populationFraction);

    redraw();
    updateNotes();
  }

  function redraw() {
    renderChart(self.data, self.expectedNumber, chart);
  }

  function resize() {
    if (chart.offsetWidth !== chartWidth) {
      chartWidth = chart.offsetWidth;
      redraw();
    }
  }

  function updateNotes() {
    notes(getNotesData(self.data, self.expectedNumber));
  }
}

function zeroTimeout(callback) {
  return function() {
    window.setTimeout(callback, 0);
  }
}

function getDimensions(chart) {
  var margin = {top: 20, right: 20, bottom: 30, left: 40};

  return {
    margin: margin,
    width: chart.offsetWidth - margin.left - margin.right,
    height: chart.offsetHeight - margin.top - margin.bottom
  };
}

function initSVG(chart) {
  var dim = getDimensions(chart);
  var svg = d3.select(chart).select("svg > g");

  if (svg.empty()) {
    svg = d3.select(chart)
            .append("svg")
            .append("g")
            .attr("transform", "translate(" + dim.margin.left + "," + dim.margin.top + ")");

    svg.append("g")
       .attr("class", "x axis")
       .attr("transform", "translate(0," + dim.height + ")")

    svg.append("g")
       .attr("class", "y axis")
  }

  return svg;
}

function renderChart(data, expectedNumber, chart) {
  var dim = getDimensions(chart);
  var barWidth = dim.width / data.length;

  var x = d3.scale.ordinal()
            .domain(data.map(function(d, i) { return i }))
            .rangeRoundBands([0, dim.width], .1);

  var y = d3.scale.linear()
            .domain([0, d3.max(data)])
            .rangeRound([dim.height, 0]);

  var xAxis = d3.svg.axis()
                .scale(x)
                .orient("bottom");

  var maxTickWidth = 20;

  if (data.length * maxTickWidth > dim.width) {
    var range = x.range();
    var left  = range[0];
    var right = range[range.length-1];

    var linearX = d3.scale.linear()
                    .domain([0, data.length])
                    .range([left, right]);

    xAxis.scale(linearX);
  }

  var yAxis = d3.svg.axis()
                .scale(y)
                .ticks(2)
                .orient("left");

  var svg = initSVG(chart);

  svg.attr("width",  dim.width + dim.margin.left + dim.margin.right)
     .attr("height", dim.height + dim.margin.top + dim.margin.bottom);

  svg.select(".x.axis").call(xAxis);
  svg.select(".y.axis").call(yAxis);

  var bar = svg.selectAll(".bar").data(data)

  bar.enter()
    .append("g")
    .append("rect")
      .attr("y", dim.height)
      .attr("height", 0);

  bar.exit().remove();

  bar.attr("class", function(d, i) {
       if (i < expectedNumber) return "bar under-representation";
       if (i > expectedNumber) return "bar over-representation";
       return "bar";
     });

  bar.select("rect")
     .attr("x", function(d, i) { return x(i) })
     .attr("width", x.rangeBand())
   .transition()
     .attr("y", y)
     .attr("height", function(d) { return dim.height - y(d) });
}

function getNotesData(data, expectedNumber) {
  var over       = data.filter(function(p, i) { return i > expectedNumber }).reduce(function(a, b) { return a+b }, 0);
  var under      = data.filter(function(p, i) { return i < expectedNumber }).reduce(function(a, b) { return a+b }, 0);
  var none       = data[0];

  var showOverVsNone = (none > 0) && (over > 0);
  var overVsNone     = showOverVsNone && Math.round(over/none);

  return {
    overPercentage:  toPercentage(over),
    underPercentage: toPercentage(under),
    nonePercentage:  toPercentage(none),
    showOverVsNone:  showOverVsNone,
    overVsNone:      overVsNone
  };

  function toPercentage(p) {
    var percentage = (p * 100);

    if (percentage === 0)   return "0";
    if (percentage >= 99.5) return percentage.toPrecision(3);
    if (percentage < 0.01)  return "<0.01";

    return percentage.toPrecision(2);
  }
}

function poisson(n, p) {
  var probabilities = [];

  for (var i=0; i<=n; i++) {
    probabilities.push(fact(n) / (fact(i)*fact(n-i)) * Math.pow(p, i) * Math.pow(1-p, n-i));
  }

  return probabilities;
}

function fact(n) {
  if (n < 2) return 1;
  var out = n;
  while (--n) out *= n;
  return out;
}
