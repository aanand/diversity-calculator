var numSpeakers = document.querySelector("input[name=numSpeakers]").valueAsNumber;
var populationPercentage = document.querySelector("input[name=populationPercentage]").valueAsNumber;
var data = poisson(numSpeakers, populationPercentage/100);

drawChart(data, d3.select(".chart").append("svg"), 420, 200);

function drawChart(data, svg, width, height) {
  var barWidth = width / data.length;
  var barHeight = height * 0.9;

	var chart = svg.attr("width", width)
			           .attr("height", height);

  var y = d3.scale.linear()
            .domain([0, d3.max(data)])
            .range([0, barHeight]);

  var bar = chart.selectAll(".bar")
       .data(data)
     .enter().append("g")
       .attr("class", "bar")
			 .attr("transform", function(d, i) { return "translate(" + (i * barWidth) + ")"  });

  bar.append("rect")
     .attr("x", 0)
     .attr("y", function(d) { return barHeight - y(d) })
     .attr("width", barWidth)
     .attr("height", y);

  bar.append("text")
     .attr("x", barWidth/2)
     .attr("y", height)
     .text(function(d, i) { return i });
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
