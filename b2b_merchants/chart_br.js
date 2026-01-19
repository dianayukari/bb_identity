const COLORS = {
  purple100: "#9C50FF",
  chartLight: "#E0E0E0",
  chartMedium: "#808080",
  darkOrange: "#BA5E00",
  lightNeonGreen: "#F6FAE6"
};

const CHART_CONFIG = {
  maxWidth: 1200,
  defaultWidth: 800,
  height: 200,
  margin: { top: 10, right: 20, bottom: 20, left: 110 }
};

const RESPONSIVE_CONFIG = {
  mobileBreakpoint: 768,
  tickCounts: {
    mobile: 3,
    desktop: 5
  },
  fontSizes: {
    legend: "13px",
    axis: "13px",
    title: "14px"
  },
  elements: {
    legendSquareSize: "15px",
    marketDotSize: "12px",
    marketDotRadius: 5,
    marketDotStrokeWidth: 1
  }
};

const POSITIONING = {
  legendGap: "5px",
  yAxisOffset: -10,
  titleY: 15,
  yScaleStart: 20,
  padding: 0.1,
  axisBottomOffset: 10
};

let data_ebanx, data_market;

const container_br = d3.select(".container_br");
const tooltip = d3.select(".tooltip");

let width = Math.min(container_br.node().getBoundingClientRect().width, CHART_CONFIG.maxWidth) || CHART_CONFIG.defaultWidth;
let boundedWidth = width - CHART_CONFIG.margin.left - CHART_CONFIG.margin.right;
let boundedHeight = CHART_CONFIG.height - CHART_CONFIG.margin.top - CHART_CONFIG.margin.bottom;

// Helper functions for responsive design
function isMobileViewport() {
  return window.innerWidth < RESPONSIVE_CONFIG.mobileBreakpoint;
}

function getResponsiveTickCount() {
  const screenWidth = window.innerWidth;
  return screenWidth < 480 ? RESPONSIVE_CONFIG.tickCounts.mobile : RESPONSIVE_CONFIG.tickCounts.desktop;
}

/**
 * Creates and configures the legend for EBANX merchants and market average
 */
function setupLegend() {
  const globalLegend = d3.select(".legend");

  // EBANX Merchants legend item
  const ebanxLegend = globalLegend.append("div")
    .style("display", "flex")
    .style("align-items", "center")
    .style("gap", POSITIONING.legendGap);

  ebanxLegend.append("div")
    .style("width", RESPONSIVE_CONFIG.elements.legendSquareSize)
    .style("height", RESPONSIVE_CONFIG.elements.legendSquareSize)
    .style("background", COLORS.purple100);

  ebanxLegend.append("span")
    .style("font-size", RESPONSIVE_CONFIG.fontSizes.legend)
    .text("EBANX Merchants");

  // Market Average legend item
  const marketLegend = globalLegend.append("div")
    .style("display", "flex")
    .style("align-items", "center")
    .style("gap", POSITIONING.legendGap);

  marketLegend.append("div")
    .style("width", RESPONSIVE_CONFIG.elements.marketDotSize)
    .style("height", RESPONSIVE_CONFIG.elements.marketDotSize)
    .style("background", COLORS.darkOrange)
    .style("border", `2px solid ${COLORS.lightNeonGreen}`)
    .style("border-radius", "50%");

  marketLegend.append("span")
    .style("font-size", RESPONSIVE_CONFIG.fontSizes.legend)
    .text("Market Average");
}

//read and parse data
d3.csv("pay_profile_br.csv", (d) => ({
  vertical: d.merchant_vertical_commercial,
  method: d.metodo_de_pagamento_ajustado,
  value: +d.value * 100,
  type: d.type,
})).then((loadedData) => {
  // Filter data by type
  data_ebanx = loadedData.filter((d) => d.type == "pct_tpv_ebanx_b2b");
  data_market = loadedData.filter((d) => d.type == "market_average");

  setupLegend();
  initChartBr();
});

/**
 * Initializes the Brazil payment profile charts
 * Groups data by vertical and creates individual bar charts
 */
function initChartBr() {
  const groupedEbanx = d3.group(data_ebanx, (d) => d.vertical);
  const groupedMarket = d3.group(data_market, (d) => d.vertical);

  const verticals = Array.from(groupedEbanx, ([vertical, methods]) => ({
    vertical: vertical,
    methods: methods.sort((a, b) => b.value - a.value),
    marketData: groupedMarket.get(vertical) || [],
  }));

  // Create individual chart for each vertical
  verticals.forEach((verticalData, index) => {
    createBarChart(verticalData, index, container_br);
  });

  d3.select("body")
    .on("click.tooltip", function () {
      hideTooltip();
    });
}

/**
 * Creates a horizontal bar chart for a specific vertical's payment methods
 * @param {Object} verticalData - Contains vertical name, methods data, and market data
 * @param {Object} container - D3 selection of container element
 */
function createBarChart(verticalData, index, container) {
  const svg = container.append("svg")
    .attr("viewBox", `0 0 ${width} ${CHART_CONFIG.height}`)
    .attr("preserveAspectRatio", "xMidyMid meet")
    .attr("width", width);

  const g = svg.append("g")
    .attr("transform", `translate(${CHART_CONFIG.margin.left}, ${CHART_CONFIG.margin.top})`);

  //scales
  const xScale = d3.scaleLinear()
    .domain([0, 100])
    .range([0, boundedWidth]);

  const yScale = d3.scaleBand()
    .domain(verticalData.methods.map((d) => d.method))
    .range([POSITIONING.yScaleStart, boundedHeight])
    .padding(POSITIONING.padding);

  //draw bars
  g.selectAll(".bar")
    .data(verticalData.methods)
    .enter()
    .append("rect")
    .attr("class", "bar")
    .attr("x", 0)
    .attr("y", (d) => yScale(d.method))
    .attr("width", (d) => xScale(d.value))
    .attr("height", yScale.bandwidth())
    .attr("fill", COLORS.purple100)
    .on("mouseover", function (e, d) {
      showTooltip(e, d, false);
    })
    .on("mouseout", function (event, d) {
      hideTooltip();
    })
    .on("click", function (e, d) {
      e.preventDefault();
      e.stopPropagation();

      showTooltip(e, d, false);
      positionTooltip(e);
    });

  // draw dots
  g.selectAll(".market-dot")
    .data(verticalData.marketData)
    .enter()
    .append("circle")
    .attr("cx", (d) => xScale(d.value))
    .attr("cy", (d) => yScale(d.method) + yScale.bandwidth() / 2)
    .attr("r", RESPONSIVE_CONFIG.elements.marketDotRadius)
    .attr("fill", COLORS.darkOrange)
    .attr("stroke", COLORS.lightNeonGreen)
    .attr("stroke-width", RESPONSIVE_CONFIG.elements.marketDotStrokeWidth)
    .on("mouseover", function (e, d) {
        showTooltip(e, d, true);
    })
    .on("mouseout", function (event, d) {
        hideTooltip();
    })
    .on("click", function(e, d) {
      e.preventDefault();
      e.stopPropagation();

      showTooltip(e, d, true);
      positionTooltip(e);
    });

  //draw X axis
  g.append("g")
    .attr("class", "xaxis")
    .attr("transform", `translate(0, ${CHART_CONFIG.height - CHART_CONFIG.margin.bottom - POSITIONING.axisBottomOffset})`)
    .call(d3.axisBottom(xScale).ticks(getResponsiveTickCount()))
    .select(".domain")
    .remove();

  // Style X axis elements
  g.selectAll(".xaxis .tick text")
    .style("fill", COLORS.chartMedium)
    .style("font-size", RESPONSIVE_CONFIG.fontSizes.axis);

  g.selectAll(".xaxis .tick line")
    .style("stroke", COLORS.chartLight);

  //draw Y axis
  g.selectAll(".method-label")
    .data(verticalData.methods)
    .enter()
    .append("text")
    .attr("class", "method-label")
    .attr("x", POSITIONING.yAxisOffset)
    .attr("y", (d) => yScale(d.method) + yScale.bandwidth() / 2 + 5)
    .attr("text-anchor", "end")
    .text((d) => d.method)
    .style("font-size", RESPONSIVE_CONFIG.fontSizes.axis);

  //vertical title
  svg.append("text")
    .attr("x", 0)
    .attr("y", POSITIONING.titleY)
    .text(verticalData.vertical)
    .style("font-size", RESPONSIVE_CONFIG.fontSizes.title)
    .style("font-weight", "bold");
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
 * Shows tooltip with market or EBANX data
 */
function showTooltip(e, d, isMarket = false) {
  const content = isMarket
    ? `<div><strong style="color: ${COLORS.darkOrange}">Market Average:</strong> ${d.value.toFixed(0)}%</div>`
    : `<div><strong style="color: ${COLORS.purple100}">EBANX Merchants:</strong> ${d.value.toFixed(0)}%</div>`;

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