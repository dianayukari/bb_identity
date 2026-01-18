let aqua = "#4BDBBA";
let purple100 = "#9C50FF";
let chartLight = "#E0E0E0";
let chartMedium = "#808080";

let data;

const width = window.innerWidth * 0.9;
const height = 400;

const margin = { top: 0, right: 10, bottom: 20, left: 120 };

let boundedWidth = width - margin.left - margin.right;
let boundedHeight = height - margin.top - margin.bottom;

const tooltip = d3.select(".tooltip");

d3.csv("ecomm_verticals.csv", (d) => ({
  country: d.country,
  category: d.category,
  cat_split: d.category_split,
  value: +d.value * 100,
})).then((loadedData) => {
  data = loadedData;

  initChart();
});

function initChart() {
  const svg = d3.select('#chart')
    .attr('width', width)
    .attr('height', height);

  const g = svg.append('g')
    .attr('transform', `translate(${margin.left}, ${margin.top})`);

  const categories = [...new Set(data.map(d => d.category))];

  const yScale = d3.scaleBand()
    .domain(categories)
    .range([0, boundedHeight])
    .padding(1);

  const xScale = d3.scaleLinear()
    .domain([0, d3.max(data, d => d.value)])
    .range([0, boundedWidth]);

  //force simulation
  const simulation = d3.forceSimulation(data)
    .force('x', d3.forceX(d => xScale(d.value)))
    .force('y', d3.forceY(d => yScale(d.category) + yScale.bandwidth() / 2))
    .force('collide', d3.forceCollide(6))
    .stop();

  for (let i = 0; i < 300; ++i) simulation.tick();

  //x axis
  g.append("g")
    .attr("class", "xaxis")
    .attr("transform", `translate(0, ${boundedHeight})`)
    .call(d3.axisBottom(xScale))
    .select(".domain").remove()

  d3.selectAll(".xaxis .tick line")
    .attr("stroke", chartLight)

  d3.selectAll(".xaxis .tick text")
    .attr("fill", chartMedium)
    .style("font-size", "13px");

  //y axis
  g.append("g")
    .attr("class", "yaxis")
    .attr('transform', `translate(-10, 0)`)
    .call(d3.axisLeft(yScale)
      .tickSize(-width))
    .select(".domain").remove();

  d3.selectAll(".yaxis .tick line")
    .attr("stroke", chartLight)

  d3.selectAll(".yaxis .tick text")
    .style("font-size", "13px");

  //draw circles
  const circles = g.selectAll('.circle')
    .data(data)
    .enter()
    .append('circle')
    .attr('class', d => `circle country-${d.country.replace(/\s+/g, '-')}`)
    .attr('r', 4)
    .attr('cx', d => d.x)
    .attr('cy', d => d.y)
    .attr("fill", aqua)
    .style("opacity", 0.6)

  circles
    .on("mouseover", handleHighlight)
    .on("mouseout", handleUnhighlight)
    .on("click", handleHighlight);

  svg.on("click", function (event) {
    if (event.target.tagName === "svg" || event.target.tagName === "g") {
      selectedCountry = null;
      handleUnhighlight();
    }
  });
}

function resetAllCircles() {
  d3.selectAll(".circle")
    .attr("r", 4)
    .attr("fill", aqua)
    .style("opacity", 0.6);
}

function hideTooltip() {
  tooltip.transition()
    .duration(300)
    .style("opacity", 0);
}

function handleHighlight(e, d) {
  const countryName = d.country;
  const countryClass = `country-${countryName.replace(/\s+/g, '-')}`;

  resetAllCircles()
  showTooltip(e, d);

  d3.selectAll(`.${countryClass}`)
    .attr("fill", purple100)
    .attr("r", 6)
    .style("opacity", 1);
    
}

function handleUnhighlight(e,d) {
  resetAllCircles()
  hideTooltip()
}

function showTooltip(e, d) {
  tooltip.interrupt();

  const countryName = d.country;
  const tooltipContent =
    `<strong style="color: ${purple100}">${countryName}</strong><br/>
      ${d.cat_split}: ${d.value.toFixed(1)}`;

  const tooltipWidth = 100;
  const tooltipHeight = 50;

  let x = e.pageX + 10;
  let y = e.pageY + 10;

  if (x + tooltipWidth > window.innerWidth) {
    x = e.pageX - tooltipWidth;
  }

  if (y + tooltipHeight > window.innerHeight) {
    y = e.pageY - tooltipHeight;
  }

  tooltip
    .html(tooltipContent)
    .style("opacity", 1)
    .style("left", x + "px")
    .style("top", y + "px");

}

