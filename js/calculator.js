window.calculator = initCalculator({
  chart: document.querySelector(".chart")
});

ko.applyBindings(calculator);

function initCalculator(self) {
  var groupName = self.groupName = ko.observable();
  var numSpeakers = self.numSpeakers = ko.observable();
  var populationPercentage = self.populationPercentage = ko.observable();

  var input = self.input = ko.computed(function() {
    var groupNameVal = String(groupName());
    var numSpeakersVal = window.parseInt(numSpeakers());
    var populationPercentageVal = window.parseFloat(populationPercentage());

    return {
      groupName: groupNameVal,
      numSpeakers: numSpeakersVal,
      populationPercentage: populationPercentageVal,

      valid: (
        groupNameVal.length     >= 1 &&
        numSpeakersVal          >= 1 &&
        numSpeakersVal          <= 100 &&
        populationPercentageVal >= 0 &&
        populationPercentageVal <= 100
      )
    }
  }).extend({ throttle: 250 });

  var notes = self.notes = ko.observable();
  var chart = self.chart;

  var chartWidth = chart.offsetWidth;

  populateFromURL();
  setupEvents();
  recalculate();

  return self;

  function setupEvents() {
    input.subscribe(recalculate);
    input.subscribe(updateURL);

    window.addEventListener("resize", resize, false);
    window.addEventListener("popstate", populateFromURL, false);
  }

  function recalculate() {
    var inputVal = input();
    if (!inputVal.valid) return;

    var populationFraction = inputVal.populationPercentage/100;

    self.expectedNumber = inputVal.numSpeakers * populationFraction;
    self.data = binomial(inputVal.numSpeakers, populationFraction);

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

  function updateURL() {
    if (!input().valid) return;

    var newSearch = '?groupName=' + encodeURIComponent(groupName())
                  + '&numSpeakers=' + encodeURIComponent(numSpeakers())
                  + '&populationPercentage=' + encodeURIComponent(populationPercentage());

    if (window.location.search !== newSearch)
      window.history.pushState(null, null, window.location.pathname + newSearch);
  }

  function populateFromURL() {
    var params = parseUri(window.location.href).queryKey;

    groupName(('groupName' in params) ? window.decodeURIComponent(params.groupName) : "women");
    numSpeakers(('numSpeakers' in params) ? window.decodeURIComponent(params.numSpeakers) : "20");
    populationPercentage(('populationPercentage' in params) ? window.decodeURIComponent(params.populationPercentage) : "10");
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
              .attr("width",  dim.width + dim.margin.left + dim.margin.right)
              .attr("height", dim.height + dim.margin.top + dim.margin.bottom)
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
       if (i === expectedNumber) return "bar exact-representation";
       if (i === 0)              return "bar no-representation";
       if (i > expectedNumber)   return "bar over-representation";
       if (i < expectedNumber)   return "bar under-representation";
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
  var exact      = data.filter(function(p, i) { return i === expectedNumber }).reduce(function(a, b) { return a+b }, 0);
  var under      = data.filter(function(p, i) { return i < expectedNumber }).reduce(function(a, b) { return a+b }, 0);
  var none       = data[0];

  var notesData = {
    overPercentage:  toPercentage(over),
    exactPercentage: toPercentage(exact),
    underPercentage: toPercentage(under),
    nonePercentage:  toPercentage(none)
  };

  if (none > 0 && over > 0 && over/none >= 0.05) {
    notesData.showOverVsNone = true;
    notesData.overVsNone = toNice(over/none);
  }

  return notesData;
}

function toNice(num) {
  if (num < 10) {
    return num.toFixed(1);
  } else {
    return String(Math.round(num)).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }
}

function toPercentage(p) {
  var percentage = (p * 100);

  if (percentage === 0)   return "0";
  if (percentage >= 99.5) return percentage.toPrecision(3);
  if (percentage < 0.01)  return "<0.01";

  return percentage.toPrecision(2);
}

function binomial(n, p) {
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
