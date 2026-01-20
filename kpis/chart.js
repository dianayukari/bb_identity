// Color palette configuration
const COLORS = {
  aqua: "#4BDBBA",
  purple100: "#9C50FF",
  chartLight: "#E0E0E0",
  chartMedium: "#808080",
};

// Chart configuration
const CHART_CONFIG = {
  height: 200,
  margin: { top: 60, right: 40, bottom: 40, left: 10 },
};

// Responsive configuration
const RESPONSIVE_CONFIG = {
  mobileBreakpoint: 768,
  legendSquareSize: "15px",
  fontSizes: {
    legend: "13px",
    axis: "13px",
    title: "14px",
  },
};

// Positioning configuration
const POSITIONING = {
  legendGap: "5px",
  yAxisOffset: 90,
  padding: 0.1,
};

// State variables
let data_loyalty;
let data_transactions;
let data_ticket;
let countries;
let selectedCountry = "Brazil";
let colorScale;

function getChartWidth() {
  const chartAreaWidth = d3.select("#chart-area").node().getBoundingClientRect().width;
  if (isMobileViewport()) {
    return chartAreaWidth;  // Full width on mobile
  }
  return (chartAreaWidth - (10 * (3 - 1))) / 3.2;  // 1/3 width on desktop
}

const width = getChartWidth()
const height = CHART_CONFIG.height;

const margin = CHART_CONFIG.margin;
let boundedWidth = width - margin.left - margin.right;
let boundedHeight = height - CHART_CONFIG.margin.top - CHART_CONFIG.margin.bottom;

const chartArea = d3.select("#chart-area");
const tooltip = d3.select(".tooltip");

// Helper functions for responsive design
function isMobileViewport() {
  return window.innerWidth < RESPONSIVE_CONFIG.mobileBreakpoint;
}

/**
 * Creates and configures the legend for A2A and non-A2A payment methods
 */
function setupLegend() {
  const globalLegend = d3.select(".legend");

  // A2A legend item
  const a2aLegend = globalLegend.append("div")
    .style("display", "flex")
    .style("align-items", "left")
    .style("gap", POSITIONING.legendGap);

  a2aLegend.append("div")
    .style("width", RESPONSIVE_CONFIG.legendSquareSize)
    .style("height", RESPONSIVE_CONFIG.legendSquareSize)
    .style("background", COLORS.purple100);

  a2aLegend.append("span")
    .style("font-size", RESPONSIVE_CONFIG.fontSizes.legend)
    .text("A2A");

  // Not A2A legend item
  const notA2aLegend = globalLegend.append("div")
    .style("display", "flex")
    .style("align-items", "center")
    .style("gap", POSITIONING.legendGap);

  notA2aLegend.append("div")
    .style("width", RESPONSIVE_CONFIG.legendSquareSize)
    .style("height", RESPONSIVE_CONFIG.legendSquareSize)
    .style("background", COLORS.aqua);

  notA2aLegend.append("span")
    .style("font-size", RESPONSIVE_CONFIG.fontSizes.legend)
    .text("Not A2A");
}

// Load and parse CSV data
d3.csv("kpis.csv", (d) => ({
  country: d.country_name,
  method: d.metodo_de_pagamento_ajustado,
  type: d.type,
  value: +d.value * 100,
  a2a: d.is_A2A,
})).then((loadedData) => {
  // Filter data by type
  data_loyalty = loadedData.filter((d) => d.type === "Loyalty");
  data_transactions = loadedData.filter((d) => d.type === "Transactions");
  data_ticket = loadedData.filter((d) => d.type === "Average Ticket");
  countries = [...new Set(data_loyalty.map((d) => d.country))];

  setupLegend();
  initChart();
});

/**
 * Initializes the KPI charts
 */
function initChart() {
  setupDropdown();

  if (!isMobileViewport()) {
    drawYAxis(selectedCountry);
  }

  drawBarChart(data_loyalty, selectedCountry);
  drawBarChart(data_ticket, selectedCountry);
  drawBarChart(data_transactions, selectedCountry);
}

/**
 * Creates country selection dropdown
 */
function setupDropdown() {
  const dropdown = d3.select(".country-dropdown");

  dropdown
    .selectAll("option.country-option")
    .data(countries)
    .enter()
    .append("option")
    .attr("class", "country-option")
    .attr("value", (d) => d)
    .text((d) => d);

  dropdown.on("change", function () {
    selectedCountry = this.value;
    if (selectedCountry) {
      handleCountrySelection(selectedCountry);
    }
  });

  dropdown.property("value", "Brazil");
}

/**
 * Handles country selection change from dropdown
 */
function handleCountrySelection(selectedCountry) {
  chartArea.selectAll("*").remove();

  if (!isMobileViewport()) {
    drawYAxis(selectedCountry);
  }

  drawBarChart(data_loyalty, selectedCountry);
  drawBarChart(data_ticket, selectedCountry);
  drawBarChart(data_transactions, selectedCountry);
}

/**
 * Draws a horizontal bar chart for the given data and country
 */
function drawBarChart(data, selectedCountry) {
  const countryData = data.filter((d) => d.country === selectedCountry);
  const varName = data.map((d) => d.type)[0];
  const width = getChartWidth();
  const leftMargin = isMobileViewport() ? 100 : CHART_CONFIG.margin.left;

  const svg = chartArea.append("svg")
    .attr("width", width)
    .attr("height", height);

  const g = svg.append("g")
    .attr("transform", `translate(${leftMargin}, ${CHART_CONFIG.margin.top})`);

  // Title
  g.append("text")
    .text(varName)
    .attr("transform", `translate(0, ${-10})`)
    .style("font-size", RESPONSIVE_CONFIG.fontSizes.title)
    .style("font-weight", "bold");

  // Scales
  const xScale = d3.scaleLinear()
    .domain([0, d3.max(countryData, (d) => d.value)])
    .range([0, boundedWidth]);

  const yScale = d3.scaleBand()
    .domain(countryData.map((d) => d.method))
    .range([0, boundedHeight])
    .padding(POSITIONING.padding);

  colorScale = d3.scaleOrdinal()
    .domain([...new Set(data.map((d) => d.a2a))])
    .range([COLORS.aqua, COLORS.purple100]);

  // Draw bars
  const bars = g.selectAll(".bar")
    .data(countryData)
    .enter()
    .append("rect")
    .attr("class", "bar")
    .attr("x", 0)
    .attr("y", (d) => yScale(d.method))
    .attr("width", 0)
    .attr("height", yScale.bandwidth())
    .attr("fill", (d) => colorScale(d.a2a));

  bars.transition()
    .duration(500)
    .ease(d3.easeQuadOut)
    .attr("width", (d) => xScale(d.value));

  bars.on("mouseover", function (e, d) {
      showTooltip(e, d);
    })
    .on("mouseout", function () {
      hideTooltip();
    })
    .on("click", function (e, d) {
      e.preventDefault();
      e.stopPropagation();
      showTooltip(e, d);
      positionTooltip(e);
    });

  //draw X axis
  g.append("g")
    .attr("class", "xaxis")
    .attr("transform", `translate(0, ${boundedHeight})`)
    .call(d3.axisBottom(xScale).ticks(4))
    .select(".domain")
    .remove();

  // Style X axis elements
  g.selectAll(".xaxis .tick text")
    .style("fill", COLORS.chartMedium)
    .style("font-size", RESPONSIVE_CONFIG.fontSizes.axis);

  g.selectAll(".xaxis .tick line")
    .style("stroke", COLORS.chartLight);

  // Draw Y axis on mobile
  if (isMobileViewport()) {
    g.selectAll(".method-label")
      .data(countryData)
      .enter()
      .append("text")
      .attr("class", "method-label")
      .attr("x", -10)
      .attr("y", (d) => yScale(d.method) + yScale.bandwidth() / 2 + 5)
      .attr("text-anchor", "end")
      .text((d) => d.method)
      .style("font-size", RESPONSIVE_CONFIG.fontSizes.axis);
  }
}

/**
 * Draws the shared Y axis for desktop view
 */
function drawYAxis(selectedCountry) {
  const countryData = data_loyalty.filter((d) => d.country === selectedCountry);

  const svg = chartArea.append("svg")
    .attr("width", 100)
    .attr("height", height);

  const g = svg.append("g")
    .attr("transform", `translate(0, ${CHART_CONFIG.margin.top})`);

  const yScale = d3.scaleBand()
    .domain(countryData.map(d => d.method))
    .range([0, boundedHeight])
    .padding(POSITIONING.padding);

  //draw Y axis
  g.selectAll(".method-label")
    .data(countryData)
    .enter()
    .append("text")
    .attr("class", "method-label")
    .attr("x", POSITIONING.yAxisOffset)
    .attr("y", (d) => yScale(d.method) + yScale.bandwidth() / 2 + 5)
    .attr("text-anchor", "end")
    .text((d) => d.method)
    .style("font-size", RESPONSIVE_CONFIG.fontSizes.axis);
}

/**
 * Positions tooltip relative to mouse cursor with collision detection
 */
function positionTooltip(e) {
  const tooltipNode = tooltip.node();
  const tooltipRect = tooltipNode.getBoundingClientRect();

  let left = e.pageX + 10;
  let top = e.pageY - 10;

  if (left + tooltipRect.width > window.innerWidth - 20) {
    left = e.pageX - tooltipRect.width - 10;
  }

  if (top + tooltipRect.height > window.innerHeight - 20) {
    top = e.pageY - tooltipRect.height - 10;
  }

  if (left < 10) {
    left = 10;
  }

  if (top < 10) {
    top = e.pageY + 20;
  }

  tooltip
    .style("left", left + "px")
    .style("top", top + "px");
}

/**
 * Shows tooltip with KPI data
 */
function showTooltip(e, d) {
  const content = `<strong>${d.type}</strong><br/>
    <strong style="color: ${colorScale(d.a2a)}">${d.method}:</strong> ${d.value.toFixed(1)}`;

  tooltip.html(content);
  positionTooltip(e);

  tooltip
    .transition()
    .duration(200)
    .style("opacity", 1);
}

/**
 * Hides the tooltip with smooth transition
 */
function hideTooltip() {
  tooltip
    .transition()
    .duration(200)
    .style("opacity", 0);
}