// Color palette configuration
const COLORS = {
  aqua: "#4BDBBA",
  purple100: "#9C50FF",
  chartLight: "#E0E0E0",
  chartMedium: "#808080"
};

// Chart configuration
const CHART_CONFIG = {
  widthRatio: 0.9,
  height: 400,
  margin: { top: 0, right: 10, bottom: 20, left: 120 },
  circleRadius: {
    default: 4,
    highlighted: 6
  },
  defaultOpacity: 0.6
};

let data;
let selectedCountry = null;

// Chart dimensions
const width = window.innerWidth * CHART_CONFIG.widthRatio;
const height = CHART_CONFIG.height;
const margin = CHART_CONFIG.margin;

let boundedWidth = width - margin.left - margin.right;
let boundedHeight = height - margin.top - margin.bottom;

const tooltip = d3.select(".tooltip");

// Load and parse CSV data
d3.csv("ecomm_verticals.csv", (d) => ({
  country: d.country,
  category: d.category,
  cat_split: d.category_split,
  value: +d.value * 100,
})).then((loadedData) => {
  data = loadedData;

  initChart();
});

/**
 * Initializes the ecommerce verticals beeswarm chart
 */
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
    .select(".domain").remove();

  d3.selectAll(".xaxis .tick line")
    .attr("stroke", COLORS.chartLight);

  d3.selectAll(".xaxis .tick text")
    .attr("fill", COLORS.chartMedium)
    .style("font-size", "13px");

  //y axis
  g.append("g")
    .attr("class", "yaxis")
    .attr('transform', `translate(-10, 0)`)
    .call(d3.axisLeft(yScale)
      .tickSize(-width))
    .select(".domain").remove();

  d3.selectAll(".yaxis .tick line")
    .attr("stroke", COLORS.chartLight);

  d3.selectAll(".yaxis .tick text")
    .style("font-size", "13px");

  //draw circles
  const circles = g.selectAll('.circle')
    .data(data)
    .enter()
    .append('circle')
    .attr('class', d => `circle country-${d.country.replace(/\s+/g, '-')}`)
    .attr('r', CHART_CONFIG.circleRadius.default)
    .attr('cx', d => d.x)
    .attr('cy', d => d.y)
    .attr("fill", COLORS.aqua)
    .style("opacity", CHART_CONFIG.defaultOpacity);

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

/**
 * Resets all circles to default styling
 */
function resetAllCircles() {
  d3.selectAll(".circle")
    .attr("r", CHART_CONFIG.circleRadius.default)
    .attr("fill", COLORS.aqua)
    .style("opacity", CHART_CONFIG.defaultOpacity);
}

/**
 * Hides the tooltip with smooth transition
 */
function hideTooltip() {
  tooltip.transition()
    .duration(300)
    .style("opacity", 0);
}

/**
 * Handles circle highlight on hover/click
 */
function handleHighlight(e, d) {
  const countryName = d.country;
  const countryClass = `country-${countryName.replace(/\s+/g, '-')}`;

  resetAllCircles();
  showTooltip(e, d);

  // Highlight all circles for this country
  d3.selectAll(`.${countryClass}`)
    .attr("fill", COLORS.purple100)
    .attr("r", CHART_CONFIG.circleRadius.highlighted)
    .style("opacity", 1);
}

/**
 * Handles circle unhighlight on mouseout
 */
function handleUnhighlight(e, d) {
  resetAllCircles();
  hideTooltip();
}

/**
 * Shows tooltip with country and category data
 */
function showTooltip(e, d) {
  tooltip.interrupt();

  const countryName = d.country;
  const tooltipContent =
    `<strong style="color: ${COLORS.purple100}">${countryName}</strong><br/>
      <strong>${d.cat_split}:</strong> ${d.value.toFixed(0)}%`;

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

