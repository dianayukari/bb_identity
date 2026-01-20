const COLORS = {
  aqua: "#4BDBBA",
  purple100: "#9C50FF",
  chartLight: "#E0E0E0",
  chartMedium: "#808080",
};

const RESPONSIVE_CONFIG = {
  mobileBreakpoint: 480,
  mobileWidthRatio: 0.9,
  desktopWidthRatio: 0.7,
};

let years, countries;
let xScale, yScale;
let volume_data, share_data;
let selectedCountry = "Brazil";

const tooltip = d3.select(".tooltip");
const parseYear = d3.timeParse("%Y");
const formatBillion = d3.format(",.0f");

// Helper function for responsive design
function isMobileViewport() {
  return window.innerWidth < RESPONSIVE_CONFIG.mobileBreakpoint;
}

// Chart dimensions based on viewport
let width;
let marginVol, marginShare;

if (isMobileViewport()) {
  width = window.innerWidth * RESPONSIVE_CONFIG.mobileWidthRatio;
  marginVol = { top: 60, right: 40, bottom: 40, left: 40 };
  marginShare = { top: 60, right: 15, bottom: 40, left: 40 };
} else {
  width = window.innerWidth * RESPONSIVE_CONFIG.desktopWidthRatio;
  marginVol = { top: 60, right: 40, bottom: 40, left: 40 };
  marginShare = { top: 60, right: 40, bottom: 40, left: 80 };
}

let heightVol = 400;
let heightShare = 200;

let boundedWidthVol = width - marginVol.left - marginVol.right;
let boundedHeightVol = heightVol - marginVol.top - marginVol.bottom;

let boundedWidthShare = width - marginShare.left - marginShare.right;
let boundedHeightShare = heightShare - marginShare.top - marginShare.bottom;

// Load and parse CSV data
d3.csv("data_global.csv", (d) => ({
  country: d.country,
  year: parseYear(d.year),
  value: +d.value,
  type: d.type,
})).then((loadedData) => {
  // Filter data by type
  volume_data = loadedData.filter((d) => d.type == "Volume (USD billion)");
  share_data = loadedData
    .filter((d) => d.type == "Share (%)")
    .filter((d) => !isNaN(d.value));
  initChart();
});

/**
 * Initializes the ecommerce global charts
 */
function initChart() {
  drawList();
  drawVolumeChart(selectedCountry);
  drawShareChart();
  drawShareChartLine(selectedCountry);

  d3.select("body").on("click.tooltip", function () {
    hideTooltip();
  });
}

/**
 * Creates country selection buttons and dropdown
 */
function drawList() {
  const countries = [...new Set(volume_data.map((d) => d.country))];
  const listContainer = d3.select(".list");

  const countryBtns = listContainer
    .selectAll(".country-btn")
    .data(countries)
    .enter()
    .append("button")
    .attr("class", "country-btn")
    .text((d) => d);

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

  countryBtns.on("click", function (e, d) {
    selectedCountry = d;

    countryBtns.classed("selected", false);
    d3.select(this).classed("selected", true);

    e.preventDefault();
    e.stopPropagation();

    updateVolumeCircles(selectedCountry);
    drawShareChartLine(selectedCountry);
  });

  d3.select(countryBtns.nodes()[0]).dispatch("click");
  dropdown.property("value", "Brazil");
}

/**
 * Handles country selection change from dropdown
 */
function handleCountrySelection(selectedCountry) {
  d3.select("#volume-chart").selectAll("*").remove();
  drawVolumeChart(selectedCountry);
  drawShareChartLine(selectedCountry);
}

/**
 * Draws the radial volume chart for a selected country
 */
function drawVolumeChart(selectedCountry) {
  const countryData = volume_data.filter((d) => d.country === selectedCountry);

  const svg = d3
    .select("#volume-chart")
    .attr("width", width)
    .attr("height", heightVol);

  const g = svg
    .append("g")
    .attr("transform", `translate(${marginVol.left}, ${marginVol.top})`);

  //main cirle params
  let radius;

  if (isMobileViewport()) {
    radius = Math.min(boundedWidthVol, boundedHeightVol) / 2.3;
  } else {
    radius = Math.min(boundedWidthVol, boundedHeightVol) / 2;
  }

  const centerX = boundedWidthVol / 2;
  const centerY = boundedHeightVol / 2;

  //scales
  const years = countryData.map((d) => d.year).sort();
  const angleScale = d3
    .scaleTime()
    .domain([parseYear(2021), parseYear(2028)])
    .range([0, 2 * Math.PI - (2 * Math.PI) / years.length]);

  const circlesRadiusScale = d3
    .scaleSqrt()
    .domain(d3.extent(countryData, (d) => d.value))
    .range([4, 16]);

  const firstYear = Math.min(...years);
  const lastYear = Math.max(...years);

  const arc = d3
    .arc()
    .innerRadius(radius)
    .outerRadius(radius)
    .startAngle(angleScale(firstYear))
    .endAngle(angleScale(lastYear));

  //draw arrow head (center arrow)
  const arrowRadius = 70;
  const startAngle = 0;
  const endAngle = Math.PI * 1.5;

  const extendedRadius = arrowRadius + 8;
  const arrowTipX = extendedRadius * Math.cos(endAngle);
  const arrowTipY = extendedRadius * Math.sin(endAngle);

  const arrowSide1X = arrowTipX - 6;
  const arrowSide1Y = arrowTipY - 4;
  const arrowSide2X = arrowTipX - 6;
  const arrowSide2Y = arrowTipY + 4;

  // Draw center arrow
  const centerArrow = g
    .append("g")
    .attr("class", "center-arrow")
    .attr("transform", `translate(${centerX + 5}, ${centerY}) rotate(-90)`);

  //arrow circular path
  const startX = arrowRadius * Math.cos(startAngle);
  const startY = arrowRadius * Math.sin(startAngle);

  const pathEndAngle = endAngle - 0.3;
  const largeArcFlag = pathEndAngle - startAngle > Math.PI ? 1 : 0;

  const continuousPath = `
    M ${startX} ${startY}
    A ${arrowRadius} ${arrowRadius} 0 ${largeArcFlag} 1 ${arrowTipX - 6} ${arrowTipY}
    L ${arrowTipX} ${arrowTipY}
    L ${arrowSide2X} ${arrowSide2Y}
    M ${arrowTipX} ${arrowTipY}
    L ${arrowSide1X} ${arrowSide1Y}
  `;

  centerArrow
    .append("path")
    .attr("d", continuousPath)
    .attr("fill", "none")
    .attr("stroke", COLORS.chartLight)
    .attr("stroke-width", 1)
    .attr("stroke-linecap", "round")
    .attr("stroke-linejoin", "round")
    .attr("opacity", 0.7);

  //draw axis circle
  g.append("path")
    .attr("d", arc)
    .attr("transform", `translate(${centerX}, ${centerY})`)
    .attr("fill", "none")
    .attr("stroke", COLORS.chartLight)
    .attr("stroke-width", 1);

  //draw dots
  g.selectAll(".circle")
    .data(countryData)
    .enter()
    .append("circle")
    .attr("class", "circle")
    .attr("cx", (d) => {
      const angle = angleScale(d.year);
      return centerX + radius * Math.cos(angle - Math.PI / 2);
    })
    .attr("cy", (d) => {
      const angle = angleScale(d.year);
      return centerY + radius * Math.sin(angle - Math.PI / 2);
    })
    .attr("r", (d) => circlesRadiusScale(d.value))
    .attr("fill", COLORS.purple100)
    .on("mouseover", function (e, d) {
      showTooltip(e, d, true);
    })
    .on("mouseout", function (e, d) {
      hideTooltip();
    })
    .on("click", function (e, d) {
      e.preventDefault();
      e.stopPropagation();

      showTooltip(e, d, true);
      positionTooltip(e);
    });

  //year labels
  g.selectAll(".year-label")
    .data(countryData)
    .enter()
    .append("text")
    .attr("class", "year-label")
    .attr("x", (d) => {
      const angle = angleScale(d.year);
      const labelRadius = radius + 35;
      return centerX + labelRadius * Math.cos(angle - Math.PI / 2);
    })
    .attr("y", (d) => {
      const angle = angleScale(d.year);
      const labelRadius = radius + 35;
      return centerY + labelRadius * Math.sin(angle - Math.PI / 2);
    })
    .text((d) => d.year.getFullYear())
    .attr("text-anchor", "middle")
    .attr("dy", "0.35em")
    .style("font-size", "13px")
    .style("fill", COLORS.chartMedium);

  g.append("text")
    .attr("x", 0)
    .attr("y", -40)
    .style("font-size", "16px")
    .style("font-weight", "bold")
    .text("Volume (USD billion)");
}

/**
 * Updates volume circle sizes when country selection changes
 */
function updateVolumeCircles(selectedCountry) {
  const countryData = volume_data.filter((d) => d.country === selectedCountry);
  const g = d3.select("#volume-chart g");

  const circlesRadiusScale = d3
    .scaleSqrt()
    .domain(d3.extent(countryData, (d) => d.value))
    .range([4, 16]);

  g.selectAll(".circle")
    .data(countryData)
    .transition()
    .duration(800)
    .attr("r", (d) => circlesRadiusScale(d.value));
}

/**
 * Draws the share percentage scatter plot
 */
function drawShareChart() {
  const svg = d3
    .select("#share-chart")
    .attr("width", width)
    .attr("height", heightShare);

  const g = svg
    .append("g")
    .attr("transform", `translate(${marginShare.left}, ${marginShare.top})`);

  years = [...new Set(share_data.map((d) => d.year))].sort();
  countries = [...new Set(share_data.map((d) => d.countries))];

  xScale = d3
    .scaleTime()
    .domain(d3.extent(years))
    .range([0, boundedWidthShare]);

  yScale = d3
    .scaleLinear()
    .domain([0, d3.max(share_data, (d) => d.value)])
    .range([boundedHeightShare, 0]);

  //draw x axis
  g.append("g")
    .attr("class", "axis xaxis")
    .attr("transform", `translate(0, ${boundedHeightShare + 10})`)
    .call(d3.axisBottom(xScale))
    .select(".domain")
    .remove();

  g.selectAll(".xaxis .tick line").style("stroke", COLORS.chartLight);

  g.selectAll(".xaxis .tick text")
    .style("font-size", "13px")
    .style("fill", COLORS.chartMedium);

  // draw y axis
  g.append("g")
    .attr("class", "axis yaxis")
    .attr("transform", `translate(-20, 0)`)
    .call(d3.axisLeft(yScale).ticks(4).tickSize(-width))
    .select(".domain")
    .remove();

  g.selectAll(".yaxis .tick line").style("stroke", COLORS.chartLight);

  g.selectAll(".yaxis .tick text")
    .style("font-size", "13px")
    .style("fill", COLORS.chartMedium);

  //draw circles for all countries
  g.selectAll(".share-dot")
    .data(share_data)
    .enter()
    .append("circle")
    .attr("class", "share-dot")
    .attr("cx", (d) => xScale(d.year))
    .attr("cy", (d) => yScale(d.value))
    .attr("r", 4)
    .attr("fill", COLORS.chartMedium)
    .attr("opacity", 0.6)
    .on("mouseover", function (e, d) {
      showTooltip(e, d, false);
    })
    .on("mouseout", function (e, d) {
      hideTooltip();
    })
    .on("click", function (e, d) {
      e.preventDefault();
      e.stopPropagation();

      showTooltip(e, d, false);
      positionTooltip(e);
    });

  //title
  g.append("text")
    .attr("x", -marginVol.left)
    .attr("y", -25)
    .style("font-size", "16px")
    .style("font-weight", "bold")
    .text("Share (%)");

  g.append("g").attr("class", "country-line-group");
}

/**
 * Draws the highlighted line for selected country on share chart
 */
function drawShareChartLine(selectedCountry) {
  const g = d3.select("#share-chart g");
  const lineGroup = d3.select(".country-line-group");

  lineGroup.selectAll("*").remove();

  const countryData = share_data.filter((d) => d.country === selectedCountry);

  const line = d3
    .line()
    .x((d) => xScale(d.year))
    .y((d) => yScale(d.value))
    .curve(d3.curveMonotoneX);

  const path = lineGroup
    .append("path")
    .datum(countryData)
    .attr("class", "country-line")
    .attr("d", line)
    .attr("fill", "none")
    .attr("stroke", COLORS.aqua)
    .attr("stroke-width", 3);

  // Animate line drawing
  const totalLength = path.node().getTotalLength();

  path
    .attr("stroke-dasharray", totalLength + " " + totalLength)
    .attr("stroke-dashoffset", totalLength)
    .transition()
    .duration(300)
    .ease(d3.easeLinear)
    .attr("stroke-dashoffset", 0);

  // Update dot colors based on selection
  g.selectAll(".share-dot").attr("fill", (d) =>
    d.country === selectedCountry ? COLORS.aqua : COLORS.chartMedium,
  );
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

  tooltip.style("left", left + "px").style("top", top + "px");
}

/**
 * Shows tooltip with volume or share data
 */
function showTooltip(e, d, isVolume = false) {
  const content = isVolume
    ? `<div><strong style="color: ${COLORS.purple100}">Volume: </strong>USD ${d.value.toFixed(1)} bi</div>`
    : `<div><strong style="color: ${d.country === selectedCountry ? COLORS.aqua : COLORS.chartMedium}">${d.country}:</strong> ${(d.value * 100).toFixed(0)}%</div>`;

  tooltip.html(content);
  positionTooltip(e);

  tooltip.transition().duration(200).style("opacity", 1);
}

/**
 * Hides the tooltip with smooth transition
 */
function hideTooltip() {
  tooltip.transition().duration(200).style("opacity", 0);
}
