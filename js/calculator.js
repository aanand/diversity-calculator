var numSpeakers = document.querySelector("input[name=numSpeakers]");
var populationPercentage = document.querySelector("input[name=populationPercentage]");
var chart = d3.select(".chart");

var expectedNumber = null;
var data = null;

numSpeakers.addEventListener("change", recalculate, false);
numSpeakers.addEventListener("keydown", recalculate, false);
populationPercentage.addEventListener("change", recalculate, false);
populationPercentage.addEventListener("keydown", recalculate, false);
window.addEventListener("resize", redraw, false);
recalculate();

function recalculate() {
  window.setTimeout(function() {
    if (!numSpeakers.validity.valid || !populationPercentage.validity.valid)
      return;

    var populationFraction = populationPercentage.valueAsNumber/100;

    expectedNumber = numSpeakers.valueAsNumber * populationFraction;
    data = poisson(numSpeakers.valueAsNumber, populationFraction);

    redraw();
  }, 0);
}

function redraw() {
  chart.node().innerHTML = '';
  drawChart(data, expectedNumber, chart);
}

function drawChart(data, expectedNumber, chart) {
  var margin = {top: 20, right: 20, bottom: 30, left: 40},
      width = chart.node().offsetWidth - margin.left - margin.right,
      height = chart.node().offsetHeight - margin.top - margin.bottom;

  var barWidth = width / data.length;

  var svg = chart.append("svg")
     .attr("width", width + margin.left + margin.right)
     .attr("height", height + margin.top + margin.bottom)
   .append("g")
     .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  var x = d3.scale.ordinal()
            .rangeRoundBands([0, width], .1);

  var y = d3.scale.linear()
            .domain([0, d3.max(data)])
            .range([height, 0]);

  var xAxis = d3.svg.axis()
                .scale(x)
                .orient("bottom");

  var yAxis = d3.svg.axis()
                .scale(y)
                .ticks(2)
                .orient("left");

  x.domain(data.map(function(d, i) { return i }));

  svg.append("g")
     .attr("class", "x axis")
     .attr("transform", "translate(0," + height + ")")
     .call(xAxis);

  svg.append("g")
     .attr("class", "y axis")
     .call(yAxis);

  var bar = svg.selectAll(".bar").data(data)

  var g = bar.enter().append("g");
  g.append("rect");
  g.append("text");

  bar.exit().remove();

  bar.attr("class", function(d, i) {
       if (i < expectedNumber) return "bar under-representation";
       if (i > expectedNumber) return "bar over-representation";
       return "bar";
     });

  bar.select("rect")
     .attr("x", function(d, i) { return x(i) })
     .attr("y", y)
     .attr("width", x.rangeBand())
     .attr("height", function(d) { return height - y(d) });
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
